import type { Scene, Camera, Entity, MeshComponent } from '../../scene/src';
import { MESH_COMPONENT } from '../../scene/src';

import type { Mat4 } from '../../math/src';
import { invertMat4, multiplyMat4, mat4 } from '../../math/src';

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

type InternalMesh = Mesh & { buffer?: unknown; indexBuffer?: unknown };
type InternalRenderTarget = RenderTarget & { framebuffer?: unknown };

type RendererState = {
  currentTarget: InternalRenderTarget | null;
  initialized: boolean;
};

let meshSequence = 0;
let targetSequence = 0;

function createMeshId(): string {
  return `mesh-${++meshSequence}`;
}

function createTargetId(): string {
  return `render-target-${++targetSequence}`;
}

function createPerspective(aspect: number): Mat4 {
  const fov = Math.PI / 3;
  const near = 0.1;
  const far = 1000;
  const f = 1 / Math.tan(fov / 2);
  return mat4([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

class RendererImpl implements Renderer {
  private _context: RenderContext = Object.freeze({ width: 0, height: 0, pixelRatio: 1 });
  private readonly meshes = new Map<string, InternalMesh>();
  private readonly materials = new Map<string, Material>();
  private readonly targets = new Map<string, InternalRenderTarget>();
  private readonly state: RendererState = { currentTarget: null, initialized: false };
  public lastFrame: RenderFrameSnapshot | null = null;

  public constructor(private config: RendererConfig = {}) {}

  public get context(): RenderContext {
    return this._context;
  }

  public async initialize(): Promise<void> {
    this.state.initialized = true;
  }

  public resize(width: number, height: number, pixelRatio = 1): void {
    this._context = Object.freeze({ width, height, pixelRatio });
  }

  public render(scene: Scene, camera: Camera): void {
    if (!this.state.initialized) return;

    const view = invertMat4(camera.entity.transform.getWorldMatrix());
    const aspect = this._context.width > 0 ? this._context.width / Math.max(1, this._context.height) : 1;
    const projection = createPerspective(aspect);

    const commands: RenderCommand[] = [];

    for (const entity of scene.getEntities()) {
      if (!entity.active) continue;

      const meshComp = entity.getComponent<MeshComponent>(MESH_COMPONENT);
      if (!meshComp || !meshComp.enabled || !meshComp.meshId) continue;

      const mesh = this.meshes.get(meshComp.meshId);
      if (!mesh) continue;

      const materialId = meshComp.materialId ?? '__default__';

      const model = entity.transform.getWorldMatrix();
      const vp = multiplyMat4(projection, view);
      const mvp = multiplyMat4(vp, model);

      commands.push({
        entityId: entity.id,
        meshId: mesh.id,
        materialId,
        modelMatrix: model,
        viewMatrix: view,
        projectionMatrix: projection,
        mvpMatrix: mvp,
        vertexCount: mesh.vertexCount,
        indexCount: mesh.indexCount,
      });
    }

    commands.sort((a, b) => (a.materialId > b.materialId ? 1 : -1));

    this.lastFrame = Object.freeze({
      commandCount: commands.length,
      viewportWidth: this._context.width,
      viewportHeight: this._context.height,
      commands: Object.freeze(commands),
    });
  }

  public setRenderTarget(target: RenderTarget | null): void {
    this.state.currentTarget = target ? (this.targets.get(target.id) ?? target) : null;
  }

  public createMesh(data: unknown): Mesh {
    const id = createMeshId();
    const vertexCount = Array.isArray(data) ? data.length / 3 : 0;
    const mesh = Object.freeze({ id, vertexCount, indexCount: 0 });
    this.meshes.set(id, mesh);
    return mesh;
  }

  public createTexture(): Texture {
    return Object.freeze({ id: 'texture', width: 0, height: 0 });
  }

  public createMaterial(config: { shader: ShaderProgram }): Material {
    const material = Object.freeze({ id: config.shader.id, shader: config.shader });
    this.materials.set(material.id, material);
    return material;
  }

  public disposeResource(resource: DisposableResource): void {
    if ('vertexCount' in resource) this.meshes.delete(resource.id);
  }
}

export function createRenderer(config: RendererConfig = {}): Renderer {
  return new RendererImpl(config);
}

export function createRenderTarget(width: number, height: number): RenderTarget {
  return Object.freeze({ id: createTargetId(), width, height });
}
