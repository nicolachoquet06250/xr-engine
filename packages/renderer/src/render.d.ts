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

export interface ShaderProgram {
    readonly id: string;
}

export interface Material {
    readonly id: string;
    readonly shader: ShaderProgram;
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
}

export interface LightRenderData {
    readonly lightId: string;
}

export interface RenderPass {
    readonly id: string;
    execute(scene: Scene, camera: Camera, context: RenderContext): void;
}

export interface Renderer {
    readonly context: RenderContext;
    initialize(config?: RendererConfig): Promise<void>;
    resize(width: number, height: number, pixelRatio?: number): void;
    render(scene: Scene, camera: Camera): void;
    setRenderTarget(target: RenderTarget | null): void;
    createMesh(data: unknown): Mesh;
    createTexture(source: TexImageSource | ImageBitmap | ImageData): Texture;
    createMaterial(config: { shader: ShaderProgram; parameters?: Record<string, unknown> }): Material;
    disposeResource(resource: Mesh | Texture | Material | ShaderProgram | UniformBuffer | GeometryBuffer | RenderTarget): void;
}

export declare function createRenderer(config?: RendererConfig): Renderer;
