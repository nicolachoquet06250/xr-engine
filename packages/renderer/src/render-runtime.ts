import type { Camera, MeshComponent, Scene } from '../../scene/src';
import { MESH_COMPONENT } from '../../scene/src';

import type { Mat4 } from '../../math/src';
import { invertMat4, mat4, multiplyMat4 } from '../../math/src';

import type {
  GeometryBuffer,
  Material,
  Mesh,
  RenderCommand,
  RenderContext,
  RenderFrameSnapshot,
  RenderTarget,
  Renderer,
  RendererConfig,
  ShaderProgram,
  Texture,
  UniformBuffer,
} from './render';

type DisposableResource =
  | Mesh
  | Texture
  | Material
  | ShaderProgram
  | UniformBuffer
  | GeometryBuffer
  | RenderTarget;

type MeshSource = {
  readonly vertexCount?: number;
  readonly indexCount?: number;
  readonly vertices?: ArrayLike<number>;
  readonly positions?: ArrayLike<number>;
  readonly indices?: ArrayLike<number>;
};

type WebGLBufferLike = unknown;
type WebGLTextureLike = unknown;
type WebGLFramebufferLike = unknown;
type WebGLProgramLike = unknown;
type WebGLShaderLike = unknown;
type WebGLUniformLocationLike = unknown;

type WebGLContextLike = {
  readonly ARRAY_BUFFER?: number;
  readonly ELEMENT_ARRAY_BUFFER?: number;
  readonly STATIC_DRAW?: number;
  readonly FRAMEBUFFER?: number;
  readonly COLOR_BUFFER_BIT?: number;
  readonly DEPTH_BUFFER_BIT?: number;
  readonly FLOAT?: number;
  readonly TRIANGLES?: number;
  readonly UNSIGNED_SHORT?: number;
  readonly VERTEX_SHADER?: number;
  readonly FRAGMENT_SHADER?: number;
  readonly COMPILE_STATUS?: number;
  readonly LINK_STATUS?: number;
  readonly DEPTH_TEST?: number;
  createBuffer?: () => WebGLBufferLike;
  bindBuffer?: (target: number, buffer: WebGLBufferLike | null) => void;
  bufferData?: (target: number, data: ArrayBufferView | number[] | number, usage: number) => void;
  deleteBuffer?: (buffer: WebGLBufferLike) => void;
  createFramebuffer?: () => WebGLFramebufferLike;
  bindFramebuffer?: (target: number, framebuffer: WebGLFramebufferLike | null) => void;
  deleteFramebuffer?: (framebuffer: WebGLFramebufferLike) => void;
  createTexture?: () => WebGLTextureLike;
  deleteTexture?: (texture: WebGLTextureLike) => void;
  viewport?: (x: number, y: number, width: number, height: number) => void;
  clearColor?: (r: number, g: number, b: number, a: number) => void;
  clear?: (mask: number) => void;
  enable?: (cap: number) => void;
  createShader?: (type: number) => WebGLShaderLike | null;
  shaderSource?: (shader: WebGLShaderLike, source: string) => void;
  compileShader?: (shader: WebGLShaderLike) => void;
  getShaderParameter?: (shader: WebGLShaderLike, pname: number) => boolean;
  deleteShader?: (shader: WebGLShaderLike) => void;
  createProgram?: () => WebGLProgramLike | null;
  attachShader?: (program: WebGLProgramLike, shader: WebGLShaderLike) => void;
  linkProgram?: (program: WebGLProgramLike) => void;
  getProgramParameter?: (program: WebGLProgramLike, pname: number) => boolean;
  deleteProgram?: (program: WebGLProgramLike) => void;
  useProgram?: (program: WebGLProgramLike | null) => void;
  getAttribLocation?: (program: WebGLProgramLike, name: string) => number;
  enableVertexAttribArray?: (index: number) => void;
  vertexAttribPointer?: (
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ) => void;
  getUniformLocation?: (program: WebGLProgramLike, name: string) => WebGLUniformLocationLike | null;
  uniformMatrix4fv?: (
    location: WebGLUniformLocationLike | null,
    transpose: boolean,
    value: ArrayLike<number>
  ) => void;
  drawArrays?: (mode: number, first: number, count: number) => void;
  drawElements?: (mode: number, count: number, type: number, offset: number) => void;
};

type InternalMesh = Mesh & {
  readonly buffer?: WebGLBufferLike;
  readonly indexBuffer?: WebGLBufferLike;
};

type InternalTexture = Texture & {
  readonly handle?: WebGLTextureLike;
};

type InternalRenderTarget = RenderTarget & {
  readonly framebuffer?: WebGLFramebufferLike;
};

type RendererState = {
  currentTarget: InternalRenderTarget | null;
  initialized: boolean;
};

type BuiltinPipeline = {
  program: WebGLProgramLike;
  positionAttribute: number;
  mvpLocation: WebGLUniformLocationLike | null;
};

let meshSequence = 0;
let textureSequence = 0;
let materialSequence = 0;
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

function createTargetId(): string {
  targetSequence += 1;
  return `render-target-${targetSequence}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getArrayLikeLength(value: unknown): number {
  return isObject(value) && typeof value.length === 'number' ? value.length : 0;
}

function inferVertexCount(data: unknown): number {
  if (isObject(data) && typeof data.vertexCount === 'number' && Number.isFinite(data.vertexCount)) {
    return Math.max(0, Math.floor(data.vertexCount));
  }

  const source = data as MeshSource;
  const positionsLength = getArrayLikeLength(source?.positions);
  if (positionsLength > 0) return Math.floor(positionsLength / 3);

  const verticesLength = getArrayLikeLength(source?.vertices);
  if (verticesLength > 0) return Math.floor(verticesLength / 3);

  return Math.floor(getArrayLikeLength(data) / 3);
}

function inferIndexCount(data: unknown): number {
  if (isObject(data) && typeof data.indexCount === 'number' && Number.isFinite(data.indexCount)) {
    return Math.max(0, Math.floor(data.indexCount));
  }

  const source = data as MeshSource;
  return getArrayLikeLength(source?.indices);
}

function extractVertexData(data: unknown, vertexCount: number): Float32Array {
  if (isObject(data) && getArrayLikeLength((data as MeshSource).vertices) > 0) {
    return Float32Array.from((data as MeshSource).vertices as ArrayLike<number>);
  }
  if (isObject(data) && getArrayLikeLength((data as MeshSource).positions) > 0) {
    return Float32Array.from((data as MeshSource).positions as ArrayLike<number>);
  }
  if (Array.isArray(data)) {
    return Float32Array.from(data);
  }
  return new Float32Array(vertexCount * 3);
}

function extractIndexData(data: unknown, indexCount: number): Uint16Array {
  if (isObject(data) && getArrayLikeLength((data as MeshSource).indices) > 0) {
    return Uint16Array.from((data as MeshSource).indices as ArrayLike<number>);
  }
  return new Uint16Array(indexCount);
}

function inferTextureDimensions(source: unknown): { width: number; height: number } {
  if (!isObject(source)) return { width: 0, height: 0 };

  const width =
    typeof source.width === 'number'
      ? source.width
      : typeof (source as Record<string, unknown>).videoWidth === 'number'
        ? ((source as Record<string, unknown>).videoWidth as number)
        : typeof (source as Record<string, unknown>).naturalWidth === 'number'
          ? ((source as Record<string, unknown>).naturalWidth as number)
          : 0;

  const height =
    typeof source.height === 'number'
      ? source.height
      : typeof (source as Record<string, unknown>).videoHeight === 'number'
        ? ((source as Record<string, unknown>).videoHeight as number)
        : typeof (source as Record<string, unknown>).naturalHeight === 'number'
          ? ((source as Record<string, unknown>).naturalHeight as number)
          : 0;

  return {
    width: Math.max(0, Math.floor(width)),
    height: Math.max(0, Math.floor(height)),
  };
}

function tryGetContext(canvas: HTMLCanvasElement, config: RendererConfig): WebGLContextLike | null {
  const attributes = {
    alpha: config.alpha ?? true,
    antialias: config.antialias ?? true,
    xrCompatible: config.xrCompatible ?? false,
  };

  return (
    (canvas.getContext('webgl2', attributes) as WebGLContextLike | null) ??
    (canvas.getContext('webgl', attributes) as WebGLContextLike | null) ??
    (canvas.getContext('experimental-webgl', attributes) as WebGLContextLike | null) ??
    null
  );
}

function createPerspectiveProjection(camera: Camera, context: RenderContext): Mat4 {
  const aspectFromContext = context.width > 0 ? context.width / Math.max(1, context.height) : 1;
  const aspect = camera.aspect > 0 ? camera.aspect : aspectFromContext;
  const near = camera.near > 0 ? camera.near : 0.1;
  const far = camera.far > near ? camera.far : 1000;

  if (camera.projection === 'orthographic') {
    const orthoHeight = Math.tan((camera.fov * Math.PI) / 360) * near || 1;
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

  const fovRadians = (camera.fov * Math.PI) / 180;
  const f = 1 / Math.tan(fovRadians / 2);

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

function buildRenderCommands(
  scene: Scene,
  camera: Camera,
  context: RenderContext,
  meshes: Map<string, InternalMesh>
): readonly RenderCommand[] {
  const viewMatrix = invertMat4(camera.entity.transform.getWorldMatrix());
  const projectionMatrix = createPerspectiveProjection(camera, context);
  const vpMatrix = multiplyMat4(projectionMatrix, viewMatrix);

  const commands: RenderCommand[] = [];

  for (const entity of scene.getEntities()) {
    if (!entity.active) continue;

    const meshComponent = entity.getComponent<MeshComponent>(MESH_COMPONENT);
    if (!meshComponent || !meshComponent.enabled || !meshComponent.meshId) continue;

    const mesh = meshes.get(meshComponent.meshId);
    if (!mesh) continue;

    const modelMatrix = entity.transform.getWorldMatrix();
    const mvpMatrix = multiplyMat4(vpMatrix, modelMatrix);

    commands.push(
      Object.freeze({
        entityId: entity.id,
        meshId: mesh.id,
        materialId: meshComponent.materialId ?? '__default__',
        modelMatrix,
        viewMatrix,
        projectionMatrix,
        mvpMatrix,
        vertexCount: mesh.vertexCount,
        indexCount: mesh.indexCount,
      })
    );
  }

  commands.sort((left, right) => {
    const materialCompare = left.materialId.localeCompare(right.materialId);
    if (materialCompare !== 0) return materialCompare;
    return left.meshId.localeCompare(right.meshId);
  });

  return Object.freeze(commands);
}

function createBuiltinPipeline(gl: WebGLContextLike): BuiltinPipeline | null {
  if (
    !gl.createShader ||
    !gl.shaderSource ||
    !gl.compileShader ||
    !gl.getShaderParameter ||
    !gl.createProgram ||
    !gl.attachShader ||
    !gl.linkProgram ||
    !gl.getProgramParameter ||
    !gl.getAttribLocation ||
    !gl.getUniformLocation ||
    gl.VERTEX_SHADER === undefined ||
    gl.FRAGMENT_SHADER === undefined ||
    gl.COMPILE_STATUS === undefined ||
    gl.LINK_STATUS === undefined
  ) {
    return null;
  }

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) return null;

  gl.shaderSource(
    vertexShader,
    'attribute vec3 a_position; uniform mat4 u_mvp; void main(){ gl_Position = u_mvp * vec4(a_position, 1.0); }'
  );
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    gl.deleteShader?.(vertexShader);
    gl.deleteShader?.(fragmentShader);
    return null;
  }

  gl.shaderSource(
    fragmentShader,
    'precision mediump float; void main(){ gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); }'
  );
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    gl.deleteShader?.(vertexShader);
    gl.deleteShader?.(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader?.(vertexShader);
    gl.deleteShader?.(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader?.(vertexShader);
  gl.deleteShader?.(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram?.(program);
    return null;
  }

  return {
    program,
    positionAttribute: gl.getAttribLocation(program, 'a_position'),
    mvpLocation: gl.getUniformLocation(program, 'u_mvp'),
  };
}

class RendererImpl implements Renderer {
  private _context: RenderContext = Object.freeze({ width: 0, height: 0, pixelRatio: 1 });
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLContextLike | null = null;
  private builtinPipeline: BuiltinPipeline | null = null;
  private readonly meshes = new Map<string, InternalMesh>();
  private readonly textures = new Map<string, InternalTexture>();
  private readonly materials = new Map<string, Material>();
  private readonly targets = new Map<string, InternalRenderTarget>();
  private readonly state: RendererState = {
    currentTarget: null,
    initialized: false,
  };
  public lastFrame: RenderFrameSnapshot | null = null;

  public constructor(private config: RendererConfig = {}) {
    if (config.canvas) {
      this.canvas = config.canvas;
      this.syncContextFromCanvas(config.canvas, 1);
    }
  }

  public get context(): RenderContext {
    return this._context;
  }

  public async initialize(config: RendererConfig = this.config): Promise<void> {
    this.config = { ...this.config, ...config };
    this.canvas = this.config.canvas ?? this.canvas;

    if (this.canvas) {
      this.gl = tryGetContext(this.canvas, this.config);
      this.syncContextFromCanvas(this.canvas, this._context.pixelRatio || 1);
    }

    if (this.gl?.enable && this.gl.DEPTH_TEST !== undefined) {
      this.gl.enable(this.gl.DEPTH_TEST);
    }

    this.builtinPipeline = this.gl ? createBuiltinPipeline(this.gl) : null;
    this.state.initialized = true;
  }

  public resize(width: number, height: number, pixelRatio = this._context.pixelRatio || 1): void {
    const normalizedWidth = Math.max(0, Math.floor(width));
    const normalizedHeight = Math.max(0, Math.floor(height));
    const normalizedPixelRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;

    this._context = Object.freeze({
      width: normalizedWidth,
      height: normalizedHeight,
      pixelRatio: normalizedPixelRatio,
    });

    if (this.canvas) {
      this.canvas.width = Math.max(1, Math.floor(normalizedWidth * normalizedPixelRatio));
      this.canvas.height = Math.max(1, Math.floor(normalizedHeight * normalizedPixelRatio));
    }
  }

  public render(scene: Scene, camera: Camera): void {
    if (!this.state.initialized) return;

    const width = this.state.currentTarget?.width ?? this._context.width;
    const height = this.state.currentTarget?.height ?? this._context.height;

    if (this.gl?.viewport) {
      this.gl.viewport(0, 0, Math.max(0, width), Math.max(0, height));
    }

    if (this.gl?.bindFramebuffer && this.gl.FRAMEBUFFER !== undefined) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.state.currentTarget?.framebuffer ?? null);
    }

    if (this.gl?.clearColor) {
      this.gl.clearColor(0, 0, 0, 0);
    }

    if (this.gl?.clear) {
      const colorMask = this.gl.COLOR_BUFFER_BIT ?? 0;
      const depthMask = this.gl.DEPTH_BUFFER_BIT ?? 0;
      this.gl.clear(colorMask | depthMask);
    }

    const commands = buildRenderCommands(scene, camera, this._context, this.meshes);

    if (this.gl && this.builtinPipeline) {
      this.gl.useProgram?.(this.builtinPipeline.program);

      for (const command of commands) {
        const mesh = this.meshes.get(command.meshId);
        if (!mesh?.buffer) continue;

        if (
          this.gl.bindBuffer &&
          this.gl.ARRAY_BUFFER !== undefined &&
          this.gl.FLOAT !== undefined &&
          this.gl.bindBuffer
        ) {
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.buffer);
          if (this.builtinPipeline.positionAttribute >= 0) {
            this.gl.enableVertexAttribArray?.(this.builtinPipeline.positionAttribute);
            this.gl.vertexAttribPointer?.(
              this.builtinPipeline.positionAttribute,
              3,
              this.gl.FLOAT,
              false,
              0,
              0
            );
          }
        }

        this.gl.uniformMatrix4fv?.(
          this.builtinPipeline.mvpLocation,
          false,
          command.mvpMatrix.elements
        );

        if (
          mesh.indexBuffer &&
          this.gl.bindBuffer &&
          this.gl.ELEMENT_ARRAY_BUFFER !== undefined &&
          this.gl.UNSIGNED_SHORT !== undefined &&
          this.gl.TRIANGLES !== undefined
        ) {
          this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
          this.gl.drawElements?.(this.gl.TRIANGLES, command.indexCount, this.gl.UNSIGNED_SHORT, 0);
        } else if (this.gl.TRIANGLES !== undefined) {
          this.gl.drawArrays?.(this.gl.TRIANGLES, 0, command.vertexCount);
        }
      }
    }

    this.lastFrame = Object.freeze({
      commandCount: commands.length,
      viewportWidth: width,
      viewportHeight: height,
      commands,
    });
  }

  public setRenderTarget(target: RenderTarget | null): void {
    if (target === null) {
      this.state.currentTarget = null;
      return;
    }

    const internalTarget =
      this.targets.get(target.id) ??
      ({ ...target, framebuffer: undefined } satisfies InternalRenderTarget);
    this.targets.set(internalTarget.id, internalTarget);
    this.state.currentTarget = internalTarget;
  }

  public createMesh(data: unknown): Mesh {
    const id = createMeshId();
    const vertexCount = inferVertexCount(data);
    const indexCount = inferIndexCount(data);

    let buffer: WebGLBufferLike | undefined;
    let indexBuffer: WebGLBufferLike | undefined;

    if (this.gl?.createBuffer && this.gl?.bindBuffer && this.gl?.bufferData) {
      if (
        vertexCount > 0 &&
        this.gl.ARRAY_BUFFER !== undefined &&
        this.gl.STATIC_DRAW !== undefined
      ) {
        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
          this.gl.ARRAY_BUFFER,
          extractVertexData(data, vertexCount),
          this.gl.STATIC_DRAW
        );
      }

      if (
        indexCount > 0 &&
        this.gl.ELEMENT_ARRAY_BUFFER !== undefined &&
        this.gl.STATIC_DRAW !== undefined
      ) {
        indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(
          this.gl.ELEMENT_ARRAY_BUFFER,
          extractIndexData(data, indexCount),
          this.gl.STATIC_DRAW
        );
      }
    }

    const mesh: InternalMesh = Object.freeze({ id, vertexCount, indexCount, buffer, indexBuffer });
    this.meshes.set(id, mesh);
    return mesh;
  }

  public createTexture(source: TexImageSource | ImageBitmap | ImageData): Texture {
    const id = createTextureId();
    const dimensions = inferTextureDimensions(source);
    const handle = this.gl?.createTexture?.();
    const texture: InternalTexture = Object.freeze({ id, ...dimensions, handle });
    this.textures.set(id, texture);
    return texture;
  }

  public createMaterial(config: {
    shader: ShaderProgram;
    parameters?: Record<string, unknown>;
  }): Material {
    const material: Material = Object.freeze({
      id: createMaterialId(),
      shader: config.shader,
    });
    this.materials.set(material.id, material);
    return material;
  }

  public disposeResource(resource: DisposableResource): void {
    if ('vertexCount' in resource) {
      const mesh = this.meshes.get(resource.id);
      if (mesh?.buffer && this.gl?.deleteBuffer) this.gl.deleteBuffer(mesh.buffer);
      if (mesh?.indexBuffer && this.gl?.deleteBuffer) this.gl.deleteBuffer(mesh.indexBuffer);
      this.meshes.delete(resource.id);
      return;
    }

    if ('shader' in resource) {
      this.materials.delete(resource.id);
      return;
    }

    if ('width' in resource && 'height' in resource && this.textures.has(resource.id)) {
      const texture = this.textures.get(resource.id);
      if (texture?.handle && this.gl?.deleteTexture) this.gl.deleteTexture(texture.handle);
      this.textures.delete(resource.id);
      return;
    }

    if ('width' in resource && 'height' in resource && this.targets.has(resource.id)) {
      const target = this.targets.get(resource.id);
      if (target?.framebuffer && this.gl?.deleteFramebuffer) {
        this.gl.deleteFramebuffer(target.framebuffer);
      }
      this.targets.delete(resource.id);
      if (this.state.currentTarget?.id === resource.id) {
        this.state.currentTarget = null;
      }
      return;
    }
  }

  private syncContextFromCanvas(canvas: HTMLCanvasElement, pixelRatio: number): void {
    const width = Number.isFinite(canvas.width) ? canvas.width : 0;
    const height = Number.isFinite(canvas.height) ? canvas.height : 0;
    this._context = Object.freeze({
      width: Math.max(0, Math.floor(width)),
      height: Math.max(0, Math.floor(height)),
      pixelRatio: pixelRatio > 0 ? pixelRatio : 1,
    });
  }
}

export function createRenderer(config: RendererConfig = {}): Renderer {
  return new RendererImpl(config);
}

export function createRenderTarget(width: number, height: number): RenderTarget {
  return Object.freeze({
    id: createTargetId(),
    width: Math.max(0, Math.floor(width)),
    height: Math.max(0, Math.floor(height)),
  });
}
