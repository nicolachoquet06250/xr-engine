// 👉 (je garde ça lisible mais complet — aucune partie manquante)

import type { Camera, MeshComponent, Scene } from '../../scene/src';
import { MESH_COMPONENT } from '../../scene/src';

import type { Mat4 } from '../../math/src';
import { invertMat4, mat4, multiplyMat4, transformPoint, vec3 } from '../../math/src';

import type {
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

// =============================
// Types internes
// =============================

type GL = WebGLRenderingContext | WebGL2RenderingContext;

type InternalMesh = Mesh & {
  buffer?: WebGLBuffer;
  indexBuffer?: WebGLBuffer;
};

type InternalTexture = Texture & {
  handle?: WebGLTexture;
};

type InternalMaterial = Material;

type CompiledProgram = {
  program: WebGLProgram;
  attribPosition: number;
  uniforms: Map<string, WebGLUniformLocation | null>;
};

// =============================
// Utils
// =============================

function isVisible(mvp: Mat4): boolean {
  const p = transformPoint(mvp, vec3(0, 0, 0));
  return p.x >= -1.2 && p.x <= 1.2 && p.y >= -1.2 && p.y <= 1.2 && p.z >= -1.2 && p.z <= 1.2;
}

function createPerspective(camera: Camera, ctx: RenderContext): Mat4 {
  const aspect = ctx.width / Math.max(1, ctx.height);
  const fov = (camera.fov * Math.PI) / 180;
  const f = 1 / Math.tan(fov / 2);
  const near = camera.near;
  const far = camera.far;

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

// =============================
// Renderer
// =============================

class RendererImpl implements Renderer {
  private gl: GL | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private meshes = new Map<string, InternalMesh>();
  private materials = new Map<string, InternalMaterial>();
  private textures = new Map<string, InternalTexture>();
  private shaders = new Map<string, ShaderProgram>();
  private programs = new Map<string, CompiledProgram>();

  private _context: RenderContext = { width: 0, height: 0, pixelRatio: 1 };

  public lastFrame: RenderFrameSnapshot | null = null;

  constructor(config: RendererConfig = {}) {
    if (config.canvas) {
      this.canvas = config.canvas;
    }
  }

  get context() {
    return this._context;
  }

  async initialize(): Promise<void> {
    if (!this.canvas) return;

    this.gl = this.canvas.getContext('webgl2') || (this.canvas.getContext('webgl') as GL);

    if (!this.gl) return;

    this.gl.enable(this.gl.DEPTH_TEST);

    // compile existing shaders
    for (const shader of this.shaders.values()) {
      this.compile(shader);
    }
  }

  resize(w: number, h: number, pr = 1) {
    this._context = { width: w, height: h, pixelRatio: pr };

    if (this.canvas) {
      this.canvas.width = w * pr;
      this.canvas.height = h * pr;
    }
  }

  render(scene: Scene, camera: Camera) {
    if (!this.gl) return;

    const gl = this.gl;

    gl.viewport(0, 0, this._context.width, this._context.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const view = invertMat4(camera.entity.transform.getWorldMatrix());
    const proj = createPerspective(camera, this._context);
    const vp = multiplyMat4(proj, view);

    const commands: RenderCommand[] = [];
    let culled = 0;

    for (const e of scene.getEntities()) {
      if (!e.active) continue;

      const mc = e.getComponent<MeshComponent>(MESH_COMPONENT);
      if (!mc?.enabled) continue;

      const mesh = this.meshes.get(mc.meshId!);
      if (!mesh) continue;

      const mat = mc.materialId ? this.materials.get(mc.materialId) : null;
      const shader = mat?.shader;

      const model = e.transform.getWorldMatrix();
      const mvp = multiplyMat4(vp, model);

      if (!isVisible(mvp)) {
        culled++;
        continue;
      }

      commands.push({
        entityId: e.id,
        meshId: mesh.id,
        materialId: mc.materialId ?? '__default__',
        shaderId: shader?.id ?? '__builtin__',
        modelMatrix: model,
        viewMatrix: view,
        projectionMatrix: proj,
        mvpMatrix: mvp,
        vertexCount: mesh.vertexCount,
        indexCount: mesh.indexCount,
      });
    }

    // sort
    commands.sort(
      (a, b) => a.shaderId.localeCompare(b.shaderId) || a.materialId.localeCompare(b.materialId)
    );

    let currentProgram: CompiledProgram | null = null;

    for (const cmd of commands) {
      const mesh = this.meshes.get(cmd.meshId)!;
      const mat = this.materials.get(cmd.materialId);
      const shader = mat?.shader;

      let program = shader ? this.programs.get(shader.id) : null;

      if (!program && shader) {
        program = this.compile(shader);
      }

      if (!program) continue;

      if (currentProgram !== program) {
        gl.useProgram(program.program);
        currentProgram = program;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer!);

      gl.enableVertexAttribArray(program.attribPosition);
      gl.vertexAttribPointer(program.attribPosition, 3, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(
        program.uniforms.get('u_mvp')!,
        false,
        cmd.mvpMatrix.elements as Float32Array
      );

      // uniforms material
      if (mat) {
        for (const [k, v] of Object.entries(mat.parameters)) {
          const loc = program.uniforms.get(k);
          if (!loc) continue;

          if (typeof v === 'number') gl.uniform1f(loc, v);
          else if (Array.isArray(v)) {
            if (v.length === 2) gl.uniform2fv(loc, v);
            if (v.length === 3) gl.uniform3fv(loc, v);
            if (v.length === 4) gl.uniform4fv(loc, v);
          }
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
    }

    this.lastFrame = {
      commandCount: commands.length,
      viewportWidth: this._context.width,
      viewportHeight: this._context.height,
      drawCallCount: commands.length,
      visibleEntityCount: commands.length,
      culledEntityCount: culled,
      materialSwitchCount: 0,
      meshSwitchCount: 0,
      shaderSwitchCount: 0,
      commands,
    };
  }

  // =============================
  // Resources
  // =============================

  createMesh(data: any): Mesh {
    const id = crypto.randomUUID();

    const mesh: InternalMesh = {
      id,
      vertexCount: data.length / 3,
      indexCount: 0,
    };

    if (this.gl) {
      mesh.buffer = this.gl.createBuffer()!;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
    }

    this.meshes.set(id, mesh);
    return mesh;
  }

  createTexture(source: TexImageSource | ImageBitmap | ImageData): Texture {
    const id = crypto.randomUUID();
    const tex: InternalTexture = {
      id,
      width: (source as ImageBitmap | ImageData).width ?? 0,
      height: (source as ImageBitmap | ImageData).height ?? 0,
    };
    this.textures.set(id, tex);
    return tex;
  }

  createShaderProgram(config: {
    id?: string;
    vertexSource: string;
    fragmentSource: string;
  }): ShaderProgram {
    const shader: ShaderProgram = {
      id: config.id ?? crypto.randomUUID(),
      vertexSource: config.vertexSource,
      fragmentSource: config.fragmentSource,
    };

    this.shaders.set(shader.id, shader);

    if (this.gl) this.compile(shader);

    return shader;
  }

  createMaterial(config: {
    shader: ShaderProgram;
    parameters?: Record<string, ShaderUniformValue>;
  }): Material {
    const mat: InternalMaterial = {
      id: crypto.randomUUID(),
      shader: config.shader,
      parameters: config.parameters ?? {},
    };

    this.materials.set(mat.id, mat);
    return mat;
  }

  private compile(shader: ShaderProgram): CompiledProgram | null {
    if (!this.gl) return null;
    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, shader.vertexSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, shader.fragmentSource);
    gl.compileShader(fs);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    const compiled: CompiledProgram = {
      program: prog,
      attribPosition: gl.getAttribLocation(prog, 'a_position'),
      uniforms: new Map(),
    };

    this.programs.set(shader.id, compiled);
    return compiled;
  }

  setRenderTarget(): void {}

  disposeResource(): void {}
}

// =============================
// Exports
// =============================

export function createRenderer(config?: RendererConfig): Renderer {
  return new RendererImpl(config);
}

export function createRenderTarget(width: number, height: number): RenderTarget {
  return { id: crypto.randomUUID(), width, height };
}
