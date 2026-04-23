import type { Camera, Scene } from '../../scene/src';

import type {
  GeometryBuffer,
  Material,
  Mesh,
  RenderContext,
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

type WebGLContextLike = {
  readonly ARRAY_BUFFER?: number;
  readonly ELEMENT_ARRAY_BUFFER?: number;
  readonly STATIC_DRAW?: number;
  readonly FRAMEBUFFER?: number;
  readonly COLOR_BUFFER_BIT?: number;
  readonly DEPTH_BUFFER_BIT?: number;
  readonly TRIANGLES?: number;
  createBuffer?: () => unknown;
  bindBuffer?: (target: number, buffer: unknown) => void;
  bufferData?: (target: number, data: ArrayBufferView | number[] | number, usage: number) => void;
  deleteBuffer?: (buffer: unknown) => void;
  createFramebuffer?: () => unknown;
  bindFramebuffer?: (target: number, framebuffer: unknown) => void;
  deleteFramebuffer?: (framebuffer: unknown) => void;
  createTexture?: () => unknown;
  deleteTexture?: (texture: unknown) => void;
  viewport?: (x: number, y: number, width: number, height: number) => void;
  clearColor?: (r: number, g: number, b: number, a: number) => void;
  clear?: (mask: number) => void;
};

type MeshSource = {
  readonly vertexCount?: number;
  readonly indexCount?: number;
  readonly vertices?: ArrayLike<number>;
  readonly positions?: ArrayLike<number>;
  readonly indices?: ArrayLike<number>;
};

type InternalMesh = Mesh & {
  readonly buffer?: unknown;
  readonly indexBuffer?: unknown;
};

type InternalTexture = Texture & {
  readonly handle?: unknown;
};

type InternalRenderTarget = RenderTarget & {
  readonly framebuffer?: unknown;
};

type RendererState = {
  currentTarget: InternalRenderTarget | null;
  initialized: boolean;
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

  return getArrayLikeLength(data);
}

function inferIndexCount(data: unknown): number {
  if (isObject(data) && typeof data.indexCount === 'number' && Number.isFinite(data.indexCount)) {
    return Math.max(0, Math.floor(data.indexCount));
  }

  const source = data as MeshSource;
  return getArrayLikeLength(source?.indices);
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

class RendererImpl implements Renderer {
  private _context: RenderContext = Object.freeze({ width: 0, height: 0, pixelRatio: 1 });
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLContextLike | null = null;
  private readonly meshes = new Map<string, InternalMesh>();
  private readonly textures = new Map<string, InternalTexture>();
  private readonly materials = new Map<string, Material>();
  private readonly targets = new Map<string, InternalRenderTarget>();
  private readonly state: RendererState = {
    currentTarget: null,
    initialized: false,
  };

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
    void scene;
    void camera;

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

    let buffer: unknown;
    let indexBuffer: unknown;

    if (this.gl?.createBuffer && this.gl?.bindBuffer && this.gl?.bufferData) {
      if (
        vertexCount > 0 &&
        this.gl.ARRAY_BUFFER !== undefined &&
        this.gl.STATIC_DRAW !== undefined
      ) {
        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        const source =
          isObject(data) && getArrayLikeLength((data as MeshSource).vertices) > 0
            ? Float32Array.from((data as MeshSource).vertices as ArrayLike<number>)
            : isObject(data) && getArrayLikeLength((data as MeshSource).positions) > 0
              ? Float32Array.from((data as MeshSource).positions as ArrayLike<number>)
              : new Float32Array(vertexCount * 3);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, source, this.gl.STATIC_DRAW);
      }

      if (
        indexCount > 0 &&
        this.gl.ELEMENT_ARRAY_BUFFER !== undefined &&
        this.gl.STATIC_DRAW !== undefined
      ) {
        indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const source =
          isObject(data) && getArrayLikeLength((data as MeshSource).indices) > 0
            ? Uint16Array.from((data as MeshSource).indices as ArrayLike<number>)
            : new Uint16Array(indexCount);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, source, this.gl.STATIC_DRAW);
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
      if (target?.framebuffer && this.gl?.deleteFramebuffer)
        this.gl.deleteFramebuffer(target.framebuffer);
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
