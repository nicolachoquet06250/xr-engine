import type { Camera, LightComponent, MeshComponent, Scene } from '../../scene/src';
import { LIGHT_COMPONENT, MESH_COMPONENT } from '../../scene/src';

import type { Mat4 } from '../../math/src';
import {
  invertMat4,
  mat4,
  multiplyMat4,
  transformDirection,
  transformPoint,
  vec3,
} from '../../math/src';

import type {
  LightRenderData,
  Material,
  Mesh,
  RenderCommand,
  RenderContext,
  RenderFrameSnapshot,
  RenderTarget,
  Renderer,
  RendererConfig,
  ShaderProgram,
  ShaderUniformValue,
  Texture,
} from './render';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

type InternalMesh = Mesh & {
  buffer?: WebGLBuffer;
  indexBuffer?: WebGLBuffer;
};

type InternalTexture = Texture & {
  handle?: WebGLTexture;
};

type InternalMaterial = Material;

type InternalRenderTarget = RenderTarget & {
  framebuffer?: WebGLFramebuffer;
};

type CompiledProgram = {
  program: WebGLProgram;
  attribPosition: number;
  uniforms: Map<string, WebGLUniformLocation | null>;
};

type BuildRenderCommandsResult = {
  commands: readonly RenderCommand[];
  culledEntityCount: number;
};

const BUILTIN_SHADER_ID = '__builtin__/unlit';
const BUILTIN_VERTEX_SOURCE = `
attribute vec3 a_position;
uniform mat4 u_mvp;

void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
}
`;
const BUILTIN_FRAGMENT_SOURCE = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

let meshSequence = 0;
let textureSequence = 0;
let materialSequence = 0;
let shaderSequence = 0;
let targetSequence = 0;

function createMeshId(): string {
  meshSequence += 1;
  return `mesh-${meshSequence}`;
}

function createTextureId(): string {
  textureSequence += 1;
  return `texture-${textureSequence}`;
}

function createMaterialId(): string {
  materialSequence += 1;
  return `material-${materialSequence}`;
}

function createShaderId(): string {
  shaderSequence += 1;
  return `shader-${shaderSequence}`;
}

function createTargetId(): string {
  targetSequence += 1;
  return `render-target-${targetSequence}`;
}

function makeShaderProgram(config: {
  id?: string;
  vertexSource: string;
  fragmentSource: string;
}): ShaderProgram {
  return Object.freeze({
    id: config.id ?? createShaderId(),
    vertexSource: config.vertexSource,
    fragmentSource: config.fragmentSource,
  });
}

function isMat4Value(value: unknown): value is Mat4 {
  if (typeof value !== 'object' || value === null) return false;
  const elements = (value as { elements?: unknown }).elements;
  return Array.isArray(elements) || ArrayBuffer.isView(elements as ArrayLike<number>);
}

function isTextureValue(value: unknown): value is Texture {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as Texture).id === 'string'
  );
}

function parseHexColor(color: string): readonly [number, number, number] {
  const normalized = color.trim().replace('#', '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [1, 1, 1];
  }

  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function createPerspective(camera: Camera, ctx: RenderContext): Mat4 {
  const aspect = camera.aspect > 0 ? camera.aspect : ctx.width / Math.max(1, ctx.height);
  const fov = (camera.fov * Math.PI) / 180;
  const f = 1 / Math.tan(fov / 2);
  const near = camera.near > 0 ? camera.near : 0.1;
  const far = camera.far > near ? camera.far : 1000;

  if (camera.projection === 'orthographic') {
    const orthoHeight = Math.tan(fov / 2) * near || 1;
    const top = orthoHeight;
    const bottom = -orthoHeight;
    const right = top * aspect;
    const left = -right;

    return mat4([
      2 / (right - left),
      0,
      0,
      0,
      0,
      2 / (top - bottom),
      0,
      0,
      0,
      0,
      -2 / (far - near),
      0,
      -(right + left) / (right - left),
      -(top + bottom) / (top - bottom),
      -(far + near) / (far - near),
      1,
    ]);
  }

  return mat4([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
}

function isVisible(mvp: Mat4): boolean {
  const p = transformPoint(mvp, vec3(0, 0, 0));
  return p.x >= -1.2 && p.x <= 1.2 && p.y >= -1.2 && p.y <= 1.2 && p.z >= -1.2 && p.z <= 1.2;
}

function countSwitches<T>(items: readonly T[], selector: (item: T) => string): number {
  let count = 0;
  let previous: string | null = null;

  for (const item of items) {
    const current = selector(item);
    if (previous !== current) {
      previous = current;
      count += 1;
    }
  }

  return count;
}

function uploadMaterialUniform(
  gl: GL,
  location: WebGLUniformLocation | null,
  value: ShaderUniformValue,
  textures: Map<string, InternalTexture>,
  textureUnitRef: { current: number }
): void {
  if (location === null) return;

  if (typeof value === 'number') {
    gl.uniform1f(location, value);
    return;
  }

  if (typeof value === 'boolean') {
    gl.uniform1i(location, value ? 1 : 0);
    return;
  }

  if (isMat4Value(value)) {
    gl.uniformMatrix4fv(location, false, value.elements as Float32List);
    return;
  }

  if (isTextureValue(value)) {
    const texture = textures.get(value.id);
    if (texture?.handle) {
      const unit = textureUnitRef.current;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture.handle);
      gl.uniform1i(location, unit);
      textureUnitRef.current += 1;
    }
    return;
  }

  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    const arrayValue = Array.from(value as ReadonlyArray<number>);
    if (arrayValue.length === 2) {
      gl.uniform2fv(location, arrayValue);
      return;
    }
    if (arrayValue.length === 3) {
      gl.uniform3fv(location, arrayValue);
      return;
    }
    if (arrayValue.length === 4) {
      gl.uniform4fv(location, arrayValue);
    }
  }
}

function collectDirectionalLights(scene: Scene): readonly LightRenderData[] {
  const lights: LightRenderData[] = [];

  for (const entity of scene.getEntities()) {
    if (!entity.active) continue;

    const light = entity.getComponent<LightComponent>(LIGHT_COMPONENT);
    if (!light || !light.enabled || light.kind !== 'directional') continue;

    const direction = transformDirection(entity.transform.getWorldMatrix(), vec3(0, 0, -1));
    const color = parseHexColor(light.color);

    lights.push(
      Object.freeze({
        lightId: entity.id,
        direction: [direction.x, direction.y, direction.z] as const,
        color,
        intensity: light.intensity,
      })
    );
  }

  return Object.freeze(lights);
}

function buildRenderCommands(
  scene: Scene,
  camera: Camera,
  ctx: RenderContext,
  meshes: Map<string, InternalMesh>,
  materials: Map<string, InternalMaterial>
): BuildRenderCommandsResult {
  const view = invertMat4(camera.entity.transform.getWorldMatrix());
  const proj = createPerspective(camera, ctx);
  const vp = multiplyMat4(proj, view);

  const commands: RenderCommand[] = [];
  let culledEntityCount = 0;

  for (const entity of scene.getEntities()) {
    if (!entity.active) continue;

    const meshComponent = entity.getComponent<MeshComponent>(MESH_COMPONENT);
    if (!meshComponent?.enabled || !meshComponent.meshId) continue;

    const mesh = meshes.get(meshComponent.meshId);
    if (!mesh) continue;

    const material = meshComponent.materialId
      ? (materials.get(meshComponent.materialId) ?? null)
      : null;

    const shaderId = material?.shader.id ?? BUILTIN_SHADER_ID;
    const model = entity.transform.getWorldMatrix();
    const mvp = multiplyMat4(vp, model);

    if (!isVisible(mvp)) {
      culledEntityCount += 1;
      continue;
    }

    commands.push(
      Object.freeze({
        entityId: entity.id,
        meshId: mesh.id,
        materialId: meshComponent.materialId ?? '__default__',
        shaderId,
        modelMatrix: model,
        viewMatrix: view,
        projectionMatrix: proj,
        mvpMatrix: mvp,
        vertexCount: mesh.vertexCount,
        indexCount: mesh.indexCount,
      })
    );
  }

  commands.sort(
    (a, b) =>
      a.shaderId.localeCompare(b.shaderId) ||
      a.materialId.localeCompare(b.materialId) ||
      a.meshId.localeCompare(b.meshId)
  );

  return {
    commands: Object.freeze(commands),
    culledEntityCount,
  };
}

class RendererImpl implements Renderer {
  private gl: GL | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private readonly meshes = new Map<string, InternalMesh>();
  private readonly materials = new Map<string, InternalMaterial>();
  private readonly textures = new Map<string, InternalTexture>();
  private readonly shaders = new Map<string, ShaderProgram>();
  private readonly programs = new Map<string, CompiledProgram>();
  private readonly renderTargets = new Map<string, InternalRenderTarget>();

  private currentRenderTarget: InternalRenderTarget | null = null;
  private _context: RenderContext = { width: 0, height: 0, pixelRatio: 1 };

  public lastFrame: RenderFrameSnapshot | null = null;

  public constructor(config: RendererConfig = {}) {
    if (config.canvas) {
      this.canvas = config.canvas;
    }

    const builtinShader = makeShaderProgram({
      id: BUILTIN_SHADER_ID,
      vertexSource: BUILTIN_VERTEX_SOURCE,
      fragmentSource: BUILTIN_FRAGMENT_SOURCE,
    });
    this.shaders.set(builtinShader.id, builtinShader);
  }

  public get context(): RenderContext {
    return this._context;
  }

  public async initialize(config?: RendererConfig): Promise<void> {
    if (config?.canvas) {
      this.canvas = config.canvas;
    }

    if (!this.canvas) return;

    this.gl = this.canvas.getContext('webgl2') || (this.canvas.getContext('webgl') as GL | null);
    if (!this.gl) return;

    this.gl.enable(this.gl.DEPTH_TEST);

    for (const shader of this.shaders.values()) {
      this.compile(shader);
    }
  }

  public resize(width: number, height: number, pixelRatio = 1): void {
    this._context = { width, height, pixelRatio };

    if (this.canvas) {
      this.canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      this.canvas.height = Math.max(1, Math.floor(height * pixelRatio));
    }
  }

  public render(scene: Scene, camera: Camera): void {
    if (!this.gl) return;

    const gl = this.gl;
    const viewportWidth = this.currentRenderTarget?.width ?? this._context.width;
    const viewportHeight = this.currentRenderTarget?.height ?? this._context.height;

    gl.viewport(0, 0, viewportWidth, viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentRenderTarget?.framebuffer ?? null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const lights = collectDirectionalLights(scene);
    const { commands, culledEntityCount } = buildRenderCommands(
      scene,
      camera,
      this._context,
      this.meshes,
      this.materials
    );

    let currentProgram: CompiledProgram | null = null;

    for (const cmd of commands) {
      const mesh = this.meshes.get(cmd.meshId);
      if (!mesh?.buffer) continue;

      const material = this.materials.get(cmd.materialId);
      const shaderId = material?.shader.id ?? BUILTIN_SHADER_ID;

      let program = this.programs.get(shaderId) ?? null;
      if (!program) {
        const shader = this.shaders.get(shaderId);
        if (shader) {
          program = this.compile(shader);
        }
      }
      if (!program) continue;

      if (currentProgram !== program) {
        gl.useProgram(program.program);
        currentProgram = program;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.enableVertexAttribArray(program.attribPosition);
      gl.vertexAttribPointer(program.attribPosition, 3, gl.FLOAT, false, 0, 0);

      let mvpLocation = program.uniforms.get('u_mvp');
      if (mvpLocation === undefined) {
        mvpLocation = gl.getUniformLocation(program.program, 'u_mvp');
        program.uniforms.set('u_mvp', mvpLocation);
      }
      if (mvpLocation) {
        gl.uniformMatrix4fv(mvpLocation, false, cmd.mvpMatrix.elements as Float32List);
      }

      const primaryLight = lights[0] ?? null;
      if (primaryLight) {
        let lightDirLocation = program.uniforms.get('u_lightDirection');
        if (lightDirLocation === undefined) {
          lightDirLocation = gl.getUniformLocation(program.program, 'u_lightDirection');
          program.uniforms.set('u_lightDirection', lightDirLocation);
        }
        if (lightDirLocation) {
          gl.uniform3fv(lightDirLocation, primaryLight.direction);
        }

        let lightColorLocation = program.uniforms.get('u_lightColor');
        if (lightColorLocation === undefined) {
          lightColorLocation = gl.getUniformLocation(program.program, 'u_lightColor');
          program.uniforms.set('u_lightColor', lightColorLocation);
        }
        if (lightColorLocation) {
          gl.uniform3fv(lightColorLocation, primaryLight.color);
        }

        let lightIntensityLocation = program.uniforms.get('u_lightIntensity');
        if (lightIntensityLocation === undefined) {
          lightIntensityLocation = gl.getUniformLocation(program.program, 'u_lightIntensity');
          program.uniforms.set('u_lightIntensity', lightIntensityLocation);
        }
        if (lightIntensityLocation) {
          gl.uniform1f(lightIntensityLocation, primaryLight.intensity);
        }
      }

      const parameters = material?.parameters ?? { u_color: [1, 1, 1, 1] as const };
      const textureUnitRef = { current: 0 };

      for (const [name, value] of Object.entries(parameters)) {
        let location = program.uniforms.get(name);
        if (location === undefined) {
          location = gl.getUniformLocation(program.program, name);
          program.uniforms.set(name, location);
        }
        uploadMaterialUniform(gl, location ?? null, value, this.textures, textureUnitRef);
      }

      if (mesh.indexBuffer && mesh.indexCount > 0) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
      }
    }

    this.lastFrame = {
      commandCount: commands.length,
      viewportWidth,
      viewportHeight,
      drawCallCount: commands.length,
      visibleEntityCount: commands.length,
      culledEntityCount,
      materialSwitchCount: countSwitches(commands, (c) => c.materialId),
      meshSwitchCount: countSwitches(commands, (c) => c.meshId),
      shaderSwitchCount: countSwitches(commands, (c) => c.shaderId),
      lightCount: lights.length,
      commands,
    };
  }

  public setRenderTarget(target: RenderTarget | null): void {
    if (target === null) {
      this.currentRenderTarget = null;
      return;
    }

    const existing = this.renderTargets.get(target.id);
    if (existing) {
      this.currentRenderTarget = existing;
      return;
    }

    const created: InternalRenderTarget = {
      id: target.id,
      width: target.width,
      height: target.height,
    };

    if (this.gl) {
      created.framebuffer = this.gl.createFramebuffer() ?? undefined;
    }

    this.renderTargets.set(created.id, created);
    this.currentRenderTarget = created;
  }

  public createMesh(data: unknown): Mesh {
    const id = createMeshId();
    const vertices = Array.isArray(data) ? data : [];
    const mesh: InternalMesh = {
      id,
      vertexCount: Math.floor(vertices.length / 3),
      indexCount: 0,
    };

    if (this.gl) {
      mesh.buffer = this.gl.createBuffer() ?? undefined;
      if (mesh.buffer) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
      }
    }

    this.meshes.set(id, mesh);
    return mesh;
  }

  public createTexture(source: TexImageSource | ImageBitmap | ImageData): Texture {
    const id = createTextureId();
    const tex: InternalTexture = {
      id,
      width: (source as ImageBitmap | ImageData).width ?? 0,
      height: (source as ImageBitmap | ImageData).height ?? 0,
    };

    if (this.gl) {
      tex.handle = this.gl.createTexture() ?? undefined;
      if (tex.handle) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex.handle);
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          source
        );
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
      }
    }

    this.textures.set(id, tex);
    return tex;
  }

  public createShaderProgram(config: {
    id?: string;
    vertexSource: string;
    fragmentSource: string;
  }): ShaderProgram {
    const shader = makeShaderProgram(config);
    this.shaders.set(shader.id, shader);

    if (this.gl) {
      this.compile(shader);
    }

    return shader;
  }

  public createMaterial(config: {
    shader: ShaderProgram;
    parameters?: Record<string, ShaderUniformValue>;
  }): Material {
    const material: InternalMaterial = Object.freeze({
      id: createMaterialId(),
      shader: config.shader,
      parameters: Object.freeze({ ...(config.parameters ?? {}) }),
    });

    this.materials.set(material.id, material);
    return material;
  }

  public disposeResource(resource: Mesh | Texture | Material | ShaderProgram | RenderTarget): void {
    if ('vertexSource' in resource && 'fragmentSource' in resource) {
      const compiled = this.programs.get(resource.id);
      if (compiled) {
        this.gl?.deleteProgram(compiled.program);
      }
      this.programs.delete(resource.id);
      this.shaders.delete(resource.id);
      return;
    }

    if ('shader' in resource) {
      this.materials.delete(resource.id);
      return;
    }

    if ('vertexCount' in resource) {
      const mesh = this.meshes.get(resource.id);
      if (mesh?.buffer) this.gl?.deleteBuffer(mesh.buffer);
      if (mesh?.indexBuffer) this.gl?.deleteBuffer(mesh.indexBuffer);
      this.meshes.delete(resource.id);
      return;
    }

    if ('width' in resource && 'height' in resource && this.textures.has(resource.id)) {
      const texture = this.textures.get(resource.id);
      if (texture?.handle) this.gl?.deleteTexture(texture.handle);
      this.textures.delete(resource.id);
      return;
    }

    if ('width' in resource && 'height' in resource && this.renderTargets.has(resource.id)) {
      const target = this.renderTargets.get(resource.id);
      if (target?.framebuffer) this.gl?.deleteFramebuffer(target.framebuffer);
      this.renderTargets.delete(resource.id);
      if (this.currentRenderTarget?.id === resource.id) {
        this.currentRenderTarget = null;
      }
    }
  }

  private compile(shader: ShaderProgram): CompiledProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;

    gl.shaderSource(vs, shader.vertexSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    gl.shaderSource(fs, shader.fragmentSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }

    const compiled: CompiledProgram = {
      program,
      attribPosition: gl.getAttribLocation(program, 'a_position'),
      uniforms: new Map(),
    };

    this.programs.set(shader.id, compiled);
    return compiled;
  }
}

export function createRenderer(config?: RendererConfig): Renderer {
  return new RendererImpl(config);
}

export function createRenderTarget(width: number, height: number): RenderTarget {
  return {
    id: createTargetId(),
    width,
    height,
  };
}

export function createShaderProgram(config: {
  id?: string;
  vertexSource: string;
  fragmentSource: string;
}): ShaderProgram {
  return makeShaderProgram(config);
}
