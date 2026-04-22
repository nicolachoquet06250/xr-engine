import type { Mat4, Quat, Vec3 } from '@xr-engine/math';

export type EntityId = string;
export type ComponentType<T extends Component = Component> = string & { readonly __component?: T };

export interface LayerMask {
  readonly value: number;
}

export interface TagSet extends ReadonlySet<string> {}

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
  readonly localMatrix: Mat4;
  readonly worldMatrix: Mat4;
  setPosition(position: Vec3): void;
  setRotation(rotation: Quat): void;
  setScale(scale: Vec3): void;
  getWorldMatrix(): Mat4;
}

export interface Component {
  readonly type: ComponentType;
  readonly entity: Entity;
  enabled: boolean;
}

export interface TransformComponent extends Component {
  readonly transform: Transform;
}

export interface Camera extends Component {
  fov: number;
  near: number;
  far: number;
  aspect: number;
  projection: 'perspective' | 'orthographic';
}

export interface CameraComponent extends Camera {}

export interface Light extends Component {
  kind: 'directional' | 'point' | 'spot' | 'ambient';
  intensity: number;
  color: string;
}

export interface LightComponent extends Light {}

export interface MeshComponent extends Component {
  meshId: string | null;
  materialId: string | null;
  castShadows: boolean;
  receiveShadows: boolean;
}

export interface RigidBodyComponent extends Component {
  bodyType: 'static' | 'dynamic' | 'kinematic';
  mass: number;
}

export interface ColliderComponent extends Component {
  shape: 'box' | 'sphere' | 'capsule' | 'mesh';
  isTrigger: boolean;
  materialId: string | null;
}

export interface AudioSourceComponent extends Component {
  clipId: string | null;
  loop: boolean;
  volume: number;
  spatial: boolean;
  autoplay: boolean;
}

export interface InteractableComponent extends Component {
  mode: 'far' | 'near' | 'both';
  canHover: boolean;
  canSelect: boolean;
  canGrab: boolean;
  canUse: boolean;
}

export interface HandInteractableComponent extends Component {
  allowPinch: boolean;
  allowPoke: boolean;
  allowNearGrab: boolean;
}

export interface SceneNode {
  readonly entity: Entity;
  readonly parent: SceneNode | null;
  readonly children: readonly SceneNode[];
}

export interface Entity {
  readonly id: EntityId;
  name: string;
  active: boolean;
  readonly transform: Transform;
  readonly tags: TagSet;
  addComponent<T extends Component>(component: T): T;
  removeComponent<T extends Component>(type: ComponentType<T>): void;
  getComponent<T extends Component>(type: ComponentType<T>): T | null;
  getComponents(): readonly Component[];
  setParent(parent: Entity | null): void;
  getParent(): Entity | null;
  getChildren(): readonly Entity[];
  addTag(tag: string): void;
  removeTag(tag: string): void;
  hasTag(tag: string): boolean;
}

export interface SceneGraph {
  readonly rootEntities: readonly Entity[];
}

export interface Scene {
  readonly id: string;
  readonly graph: SceneGraph;
  createEntity(name?: string): Entity;
  destroyEntity(id: EntityId): void;
  findEntityById(id: EntityId): Entity | null;
  findEntityByName(name: string): Entity | null;
  findEntitiesByTag(tag: string): readonly Entity[];
  getEntities(): readonly Entity[];
}

export declare const TRANSFORM_COMPONENT: ComponentType<TransformComponent>;
export declare const CAMERA_COMPONENT: ComponentType<CameraComponent>;
export declare const LIGHT_COMPONENT: ComponentType<LightComponent>;
export declare const MESH_COMPONENT: ComponentType<MeshComponent>;
export declare const RIGID_BODY_COMPONENT: ComponentType<RigidBodyComponent>;
export declare const COLLIDER_COMPONENT: ComponentType<ColliderComponent>;
export declare const AUDIO_SOURCE_COMPONENT: ComponentType<AudioSourceComponent>;
export declare const INTERACTABLE_COMPONENT: ComponentType<InteractableComponent>;
export declare const HAND_INTERACTABLE_COMPONENT: ComponentType<HandInteractableComponent>;

export type SceneSystemId =
  | 'scene.transform'
  | 'scene.render'
  | 'scene.physics'
  | 'scene.input'
  | 'scene.xr'
  | 'scene.interaction'
  | 'scene.audio'
  | 'scene.ui';

export declare const SCENE_SYSTEM_IDS: Readonly<{
  transform: 'scene.transform';
  render: 'scene.render';
  physics: 'scene.physics';
  input: 'scene.input';
  xr: 'scene.xr';
  interaction: 'scene.interaction';
  audio: 'scene.audio';
  ui: 'scene.ui';
}>;

export declare function createScene(id?: string): Scene;
export declare function createComponentType<T extends Component>(name: string): ComponentType<T>;
export declare function addTransformComponent(entity: Entity): TransformComponent;
export declare function addCameraComponent(
  entity: Entity,
  overrides?: Partial<Omit<CameraComponent, 'type' | 'entity'>>
): CameraComponent;
export declare function addLightComponent(
  entity: Entity,
  overrides?: Partial<Omit<LightComponent, 'type' | 'entity'>>
): LightComponent;
export declare function addMeshComponent(
  entity: Entity,
  overrides?: Partial<Omit<MeshComponent, 'type' | 'entity'>>
): MeshComponent;
export declare function addRigidBodyComponent(
  entity: Entity,
  overrides?: Partial<Omit<RigidBodyComponent, 'type' | 'entity'>>
): RigidBodyComponent;
export declare function addColliderComponent(
  entity: Entity,
  overrides?: Partial<Omit<ColliderComponent, 'type' | 'entity'>>
): ColliderComponent;
export declare function addAudioSourceComponent(
  entity: Entity,
  overrides?: Partial<Omit<AudioSourceComponent, 'type' | 'entity'>>
): AudioSourceComponent;
export declare function addInteractableComponent(
  entity: Entity,
  overrides?: Partial<Omit<InteractableComponent, 'type' | 'entity'>>
): InteractableComponent;
export declare function addHandInteractableComponent(
  entity: Entity,
  overrides?: Partial<Omit<HandInteractableComponent, 'type' | 'entity'>>
): HandInteractableComponent;
