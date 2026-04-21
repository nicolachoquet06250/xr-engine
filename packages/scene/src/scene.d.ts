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

export interface Camera extends Component {
  fov: number;
  near: number;
  far: number;
  aspect: number;
  projection: 'perspective' | 'orthographic';
}

export interface Light extends Component {
  kind: 'directional' | 'point' | 'spot' | 'ambient';
  intensity: number;
  color: string;
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

export declare function createScene(id?: string): Scene;
export declare function createComponentType<T extends Component>(name: string): ComponentType<T>;
