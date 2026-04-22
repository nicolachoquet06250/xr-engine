import {
  composeTRS,
  mat4,
  multiplyMat4,
  quat,
  vec3
} from '../../math/src';

import type {
  AudioSourceComponent,
  CameraComponent,
  ColliderComponent,
  Component,
  ComponentType,
  Entity,
  EntityId,
  HandInteractableComponent,
  InteractableComponent,
  LightComponent,
  MeshComponent,
  RigidBodyComponent,
  Scene,
  SceneGraph,
  TagSet,
  Transform,
  TransformComponent,
} from './scene.d';

import type { Mat4, Quat, Vec3 } from '../../math/src/index.d';

let sceneSequence = 0;
let entitySequence = 0;

const DEFAULT_POSITION = vec3(0, 0, 0);
const DEFAULT_ROTATION = quat(0, 0, 0, 1);
const DEFAULT_SCALE = vec3(1, 1, 1);
const IDENTITY_MATRIX = mat4();

function createSceneId(): string {
  sceneSequence += 1;
  return `scene-${sceneSequence}`;
}

function createEntityId(sceneId: string): EntityId {
  entitySequence += 1;
  return `${sceneId}:entity-${entitySequence}`;
}

function cloneVec3(value: Vec3): Vec3 {
  return vec3(value.x, value.y, value.z);
}

function cloneQuat(value: Quat): Quat {
  return quat(value.x, value.y, value.z, value.w);
}

class TagSetImpl extends Set<string> implements TagSet {
  public override add(_value: string): this {
    throw new Error('TagSet is read-only. Use Entity.addTag() instead.');
  }

  public override delete(_value: string): boolean {
    throw new Error('TagSet is read-only. Use Entity.removeTag() instead.');
  }

  public override clear(): void {
    throw new Error('TagSet is read-only. Use Entity.removeTag() instead.');
  }

  public unsafeAdd(value: string): void {
    super.add(value);
  }

  public unsafeDelete(value: string): void {
    super.delete(value);
  }
}

class TransformImpl implements Transform {
  private _position: Vec3 = DEFAULT_POSITION;
  private _rotation: Quat = DEFAULT_ROTATION;
  private _scale: Vec3 = DEFAULT_SCALE;
  private _localMatrix: Mat4 = IDENTITY_MATRIX;
  private _worldMatrix: Mat4 = IDENTITY_MATRIX;
  private localDirty = true;
  private worldDirty = true;

  public constructor(private readonly owner: EntityImpl) {}

  public get position(): Vec3 {
    return this._position;
  }

  public set position(position: Vec3) {
    this.setPosition(position);
  }

  public get rotation(): Quat {
    return this._rotation;
  }

  public set rotation(rotation: Quat) {
    this.setRotation(rotation);
  }

  public get scale(): Vec3 {
    return this._scale;
  }

  public set scale(scale: Vec3) {
    this.setScale(scale);
  }

  public get localMatrix(): Mat4 {
    this.ensureLocalMatrix();
    return this._localMatrix;
  }

  public get worldMatrix(): Mat4 {
    this.ensureWorldMatrix();
    return this._worldMatrix;
  }

  public setPosition(position: Vec3): void {
    this._position = cloneVec3(position);
    this.markDirty();
  }

  public setRotation(rotation: Quat): void {
    this._rotation = cloneQuat(rotation);
    this.markDirty();
  }

  public setScale(scale: Vec3): void {
    this._scale = cloneVec3(scale);
    this.markDirty();
  }

  public getWorldMatrix(): Mat4 {
    return this.worldMatrix;
  }

  public markDirty(): void {
    this.localDirty = true;
    this.markWorldDirty();
  }

  public markWorldDirty(): void {
    if (this.worldDirty) return;
    this.worldDirty = true;
    for (const child of this.owner.getChildrenInternal()) {
      child.transformImpl.markWorldDirty();
    }
  }

  private ensureLocalMatrix(): void {
    if (!this.localDirty) return;
    this._localMatrix = composeTRS({
      translation: this._position,
      rotation: this._rotation,
      scale: this._scale,
    });
    this.localDirty = false;
  }

  private ensureWorldMatrix(): void {
    if (!this.worldDirty) return;
    this.ensureLocalMatrix();
    const parent = this.owner.getParentInternal();
    this._worldMatrix = parent
      ? multiplyMat4(parent.transform.getWorldMatrix(), this._localMatrix)
      : this._localMatrix;
    this.worldDirty = false;
  }
}

class EntityImpl implements Entity {
  public readonly id: EntityId;
  public active = true;
  public readonly transformImpl: TransformImpl;
  public readonly transform: Transform;
  public readonly tagsImpl = new TagSetImpl();
  public readonly tags: TagSet = this.tagsImpl;
  private readonly components = new Map<ComponentType, Component>();
  private readonly children = new Set<EntityImpl>();
  private parent: EntityImpl | null = null;

  public constructor(
    private readonly scene: SceneImpl,
    public name: string
  ) {
    this.id = createEntityId(scene.id);
    this.transformImpl = new TransformImpl(this);
    this.transform = this.transformImpl;
  }

  public addComponent<T extends Component>(component: T): T {
    const existing = this.components.get(component.type);
    if (existing && existing !== component) {
      throw new Error(
        `Component type \"${String(component.type)}\" already exists on entity \"${this.id}\".`
      );
    }
    this.components.set(component.type, component);
    return component;
  }

  public removeComponent<T extends Component>(type: ComponentType<T>): void {
    this.components.delete(type as ComponentType);
  }

  public getComponent<T extends Component>(type: ComponentType<T>): T | null {
    return (this.components.get(type as ComponentType) as T | undefined) ?? null;
  }

  public getComponents(): readonly Component[] {
    return Object.freeze([...this.components.values()]);
  }

  public setParent(parent: Entity | null): void {
    const nextParent = parent ? this.scene.requireEntity(parent.id) : null;
    if (nextParent === this) {
      throw new Error('An entity cannot be parented to itself.');
    }
    if (nextParent && nextParent.isDescendantOf(this)) {
      throw new Error('Cannot parent an entity to one of its descendants.');
    }

    if (this.parent === nextParent) return;

    this.parent?.children.delete(this);
    this.parent = nextParent;
    this.parent?.children.add(this);
    this.transformImpl.markWorldDirty();
  }

  public getParent(): Entity | null {
    return this.parent;
  }

  public getChildren(): readonly Entity[] {
    return Object.freeze([...this.children]);
  }

  public addTag(tag: string): void {
    this.tagsImpl.unsafeAdd(tag);
  }

  public removeTag(tag: string): void {
    this.tagsImpl.unsafeDelete(tag);
  }

  public hasTag(tag: string): boolean {
    return this.tagsImpl.has(tag);
  }

  public getParentInternal(): EntityImpl | null {
    return this.parent;
  }

  public getChildrenInternal(): readonly EntityImpl[] {
    return [...this.children];
  }

  private isDescendantOf(entity: EntityImpl): boolean {
    let cursor: EntityImpl | null = this.parent;
    while (cursor) {
      if (cursor === entity) return true;
      cursor = cursor.parent;
    }
    return false;
  }
}

class SceneGraphImpl implements SceneGraph {
  public constructor(private readonly scene: SceneImpl) {}

  public get rootEntities(): readonly Entity[] {
    return Object.freeze(this.scene.getRootEntities());
  }
}

class SceneImpl implements Scene {
  public readonly graph: SceneGraph;
  private readonly entities = new Map<EntityId, EntityImpl>();

  public constructor(public readonly id: string) {
    this.graph = new SceneGraphImpl(this);
  }

  public createEntity(name = 'Entity'): Entity {
    const entity = new EntityImpl(this, name);
    this.entities.set(entity.id, entity);
    addTransformComponent(entity);
    return entity;
  }

  public destroyEntity(id: EntityId): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    for (const child of entity.getChildrenInternal()) {
      this.destroyEntity(child.id);
    }
    entity.setParent(null);
    this.entities.delete(id);
  }

  public findEntityById(id: EntityId): Entity | null {
    return this.entities.get(id) ?? null;
  }

  public findEntityByName(name: string): Entity | null {
    for (const entity of this.entities.values()) {
      if (entity.name === name) return entity;
    }
    return null;
  }

  public findEntitiesByTag(tag: string): readonly Entity[] {
    return Object.freeze([...this.entities.values()].filter((entity) => entity.hasTag(tag)));
  }

  public getEntities(): readonly Entity[] {
    return Object.freeze([...this.entities.values()]);
  }

  public requireEntity(id: EntityId): EntityImpl {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Unknown entity \"${id}\".`);
    }
    return entity;
  }

  public getRootEntities(): readonly EntityImpl[] {
    return [...this.entities.values()].filter((entity) => entity.getParentInternal() === null);
  }
}

function createMutableComponent<T extends object>(component: T): T {
  return component;
}

export function createComponentType<T extends Component>(name: string): ComponentType<T> {
  return name as ComponentType<T>;
}

export const TRANSFORM_COMPONENT = createComponentType<TransformComponent>('scene/transform');
export const CAMERA_COMPONENT = createComponentType<CameraComponent>('scene/camera');
export const LIGHT_COMPONENT = createComponentType<LightComponent>('scene/light');
export const MESH_COMPONENT = createComponentType<MeshComponent>('scene/mesh');
export const RIGID_BODY_COMPONENT = createComponentType<RigidBodyComponent>('scene/rigid-body');
export const COLLIDER_COMPONENT = createComponentType<ColliderComponent>('scene/collider');
export const AUDIO_SOURCE_COMPONENT =
  createComponentType<AudioSourceComponent>('scene/audio-source');
export const INTERACTABLE_COMPONENT =
  createComponentType<InteractableComponent>('scene/interactable');
export const HAND_INTERACTABLE_COMPONENT =
  createComponentType<HandInteractableComponent>('scene/hand-interactable');

export type SceneSystemId =
  | 'scene.transform'
  | 'scene.render'
  | 'scene.physics'
  | 'scene.input'
  | 'scene.xr'
  | 'scene.interaction'
  | 'scene.audio'
  | 'scene.ui';

export const SCENE_SYSTEM_IDS = Object.freeze({
  transform: 'scene.transform',
  render: 'scene.render',
  physics: 'scene.physics',
  input: 'scene.input',
  xr: 'scene.xr',
  interaction: 'scene.interaction',
  audio: 'scene.audio',
  ui: 'scene.ui',
} as const);

export function createScene(id = createSceneId()): Scene {
  return new SceneImpl(id);
}

export function addTransformComponent(entity: Entity): TransformComponent {
  const existing = entity.getComponent(TRANSFORM_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<TransformComponent>({
    type: TRANSFORM_COMPONENT,
    entity,
    enabled: true,
    transform: entity.transform,
  });

  return entity.addComponent(component);
}

export function addCameraComponent(
  entity: Entity,
  overrides: Partial<Omit<CameraComponent, 'type' | 'entity'>> = {}
): CameraComponent {
  const existing = entity.getComponent(CAMERA_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<CameraComponent>({
    type: CAMERA_COMPONENT,
    entity,
    enabled: true,
    fov: overrides.fov ?? 60,
    near: overrides.near ?? 0.1,
    far: overrides.far ?? 1000,
    aspect: overrides.aspect ?? 1,
    projection: overrides.projection ?? 'perspective',
  });

  return entity.addComponent(component);
}

export function addLightComponent(
  entity: Entity,
  overrides: Partial<Omit<LightComponent, 'type' | 'entity'>> = {}
): LightComponent {
  const existing = entity.getComponent(LIGHT_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<LightComponent>({
    type: LIGHT_COMPONENT,
    entity,
    enabled: true,
    kind: overrides.kind ?? 'directional',
    intensity: overrides.intensity ?? 1,
    color: overrides.color ?? '#ffffff',
  });

  return entity.addComponent(component);
}

export function addMeshComponent(
  entity: Entity,
  overrides: Partial<Omit<MeshComponent, 'type' | 'entity'>> = {}
): MeshComponent {
  const existing = entity.getComponent(MESH_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<MeshComponent>({
    type: MESH_COMPONENT,
    entity,
    enabled: true,
    meshId: overrides.meshId ?? null,
    materialId: overrides.materialId ?? null,
    castShadows: overrides.castShadows ?? true,
    receiveShadows: overrides.receiveShadows ?? true,
  });

  return entity.addComponent(component);
}

export function addRigidBodyComponent(
  entity: Entity,
  overrides: Partial<Omit<RigidBodyComponent, 'type' | 'entity'>> = {}
): RigidBodyComponent {
  const existing = entity.getComponent(RIGID_BODY_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<RigidBodyComponent>({
    type: RIGID_BODY_COMPONENT,
    entity,
    enabled: true,
    bodyType: overrides.bodyType ?? 'dynamic',
    mass: overrides.mass ?? 1,
  });

  return entity.addComponent(component);
}

export function addColliderComponent(
  entity: Entity,
  overrides: Partial<Omit<ColliderComponent, 'type' | 'entity'>> = {}
): ColliderComponent {
  const existing = entity.getComponent(COLLIDER_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<ColliderComponent>({
    type: COLLIDER_COMPONENT,
    entity,
    enabled: true,
    shape: overrides.shape ?? 'box',
    isTrigger: overrides.isTrigger ?? false,
    materialId: overrides.materialId ?? null,
  });

  return entity.addComponent(component);
}

export function addAudioSourceComponent(
  entity: Entity,
  overrides: Partial<Omit<AudioSourceComponent, 'type' | 'entity'>> = {}
): AudioSourceComponent {
  const existing = entity.getComponent(AUDIO_SOURCE_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<AudioSourceComponent>({
    type: AUDIO_SOURCE_COMPONENT,
    entity,
    enabled: true,
    clipId: overrides.clipId ?? null,
    loop: overrides.loop ?? false,
    volume: overrides.volume ?? 1,
    spatial: overrides.spatial ?? true,
    autoplay: overrides.autoplay ?? false,
  });

  return entity.addComponent(component);
}

export function addInteractableComponent(
  entity: Entity,
  overrides: Partial<Omit<InteractableComponent, 'type' | 'entity'>> = {}
): InteractableComponent {
  const existing = entity.getComponent(INTERACTABLE_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<InteractableComponent>({
    type: INTERACTABLE_COMPONENT,
    entity,
    enabled: true,
    mode: overrides.mode ?? 'both',
    canHover: overrides.canHover ?? true,
    canSelect: overrides.canSelect ?? true,
    canGrab: overrides.canGrab ?? false,
    canUse: overrides.canUse ?? true,
  });

  return entity.addComponent(component);
}

export function addHandInteractableComponent(
  entity: Entity,
  overrides: Partial<Omit<HandInteractableComponent, 'type' | 'entity'>> = {}
): HandInteractableComponent {
  const existing = entity.getComponent(HAND_INTERACTABLE_COMPONENT);
  if (existing) return existing;

  const component = createMutableComponent<HandInteractableComponent>({
    type: HAND_INTERACTABLE_COMPONENT,
    entity,
    enabled: true,
    allowPinch: overrides.allowPinch ?? true,
    allowPoke: overrides.allowPoke ?? true,
    allowNearGrab: overrides.allowNearGrab ?? true,
  });

  return entity.addComponent(component);
}
