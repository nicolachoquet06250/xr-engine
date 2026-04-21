// Export type declarations from the accompanying .d.ts file.  The
// `export type` syntax ensures these exports are erased at runtime
// while still providing compile‑time information to consumers of
// this package.  Consumers can import these definitions via
// `@xr-engine/physics`.  We avoid exporting a type named
// `PhysicsWorld` directly here because the class of the same name
// already exists in the value space.  Instead `PhysicsWorld`'s
// interface is available as `IPhysicsWorld` and an alias
// `PhysicsWorldType`.
export type {
  CharacterController,
  RaycastHit,
  Collider,
  RigidBody,
  RigidBodyType,
  BoxCollider,
  CapsuleCollider,
  MeshCollider,
  CollisionEvent,
  PhysicsMaterial,
  PhysicsWorld,
  PhysicsWorldConfig,
  SphereCollider,
  TriggerEvent,
} from './physics';

export const placeholder = 'physics package initialized';
