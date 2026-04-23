import type { Mat4 } from '@xr-engine/math';
import type { Scene, Camera } from '@xr-engine/scene';

export interface RendererConfig {
  readonly canvas?: HTMLCanvasElement;
  readonly antialias?: boolean;
  readonly alpha?: boolean;
  readonly xrCompatible?: boolean;
}

export interface RenderContext {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

export interface RenderTarget {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export interface Mesh {
  readonly id: string;
  readonly vertexCount: number;
  readonly indexCount: number;
}

export interface SubMesh {
  readonly start: number;
  readonly count: number;
  readonly materialSlot: number;
}

export interface Texture {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export type ShaderUniformValue =
  | number
  | boolean
  | readonly [number, number]
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | Mat4
  | Texture
  | ReadonlyArray<number>;

export interface ShaderProgram {
  readonly id: string;
  readonly vertexSource: string;
  readonly fragmentSource: string;
}

export interface Material {
  readonly id: string;
  readonly shader: ShaderProgram;
  readonly parameters: Readonly<Record<string, ShaderUniformValue>>;
}

export interface UniformBuffer {
  readonly id: string;
  readonly byteLength: number;
}

export interface GeometryBuffer {
  readonly id: string;
}

export interface CameraRenderData {
  readonly camera: Camera;
  readonly viewMatrix: Mat4;
  readonly projectionMatrix: Mat4;
}

export interface LightRenderData {
  readonly lightId: string;
  readonly direction: readonly [number, number, number];
  readonly color: readonly [number, number, number];
  readonly intensity: number;
}

export interface RenderCommand {
  readonly entityId: string;
  readonly meshId: string;
  readonly materialId: string;
  readonly shaderId: string;
  readonly modelMatrix: Mat4;
  readonly viewMatrix: Mat4;
  readonly projectionMatrix: Mat4;
  readonly mvpMatrix: Mat4;
  readonly vertexCount: number;
  readonly indexCount: number;
}

export interface RenderInstanceBatch {
  readonly shaderId: string;
  readonly materialId: string;
  readonly meshId: string;
  readonly instanceCount: number;
  readonly commandIndices: readonly number[];
}

export interface RenderFrameSnapshot {
  readonly commandCount: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly drawCallCount: number;
  readonly visibleEntityCount: number;
  readonly culledEntityCount: number;
  readonly materialSwitchCount: number;
  readonly meshSwitchCount: number;
  readonly shaderSwitchCount: number;
  readonly lightCount: number;
  readonly instanceBatchCount: number;
  readonly instancedDrawCallCount: number;
  readonly totalInstanceCount: number;
  readonly commands: readonly RenderCommand[];
  readonly instanceBatches: readonly RenderInstanceBatch[];
}

export interface RenderPass {
  readonly id: string;
  execute(scene: Scene, camera: Camera, context: RenderContext): void;
}

export interface Renderer {
  readonly context: RenderContext;
  readonly lastFrame: RenderFrameSnapshot | null;
  initialize(config?: RendererConfig): Promise<void>;
  resize(width: number, height: number, pixelRatio?: number): void;
  render(scene: Scene, camera: Camera): void;
  setRenderTarget(target: RenderTarget | null): void;
  createMesh(data: unknown): Mesh;
  createTexture(source: TexImageSource | ImageBitmap | ImageData): Texture;
  createShaderProgram(config: {
    id?: string;
    vertexSource: string;
    fragmentSource: string;
  }): ShaderProgram;
  createMaterial(config: {
    shader: ShaderProgram;
    parameters?: Record<string, ShaderUniformValue>;
  }): Material;
  disposeResource(
    resource:
      | Mesh
      | Texture
      | Material
      | ShaderProgram
      | UniformBuffer
      | GeometryBuffer
      | RenderTarget
  ): void;
}

export declare function createRenderer(config?: RendererConfig): Renderer;
export declare function createRenderTarget(width: number, height: number): RenderTarget;
export declare function createShaderProgram(config: {
  id?: string;
  vertexSource: string;
  fragmentSource: string;
}): ShaderProgram;
