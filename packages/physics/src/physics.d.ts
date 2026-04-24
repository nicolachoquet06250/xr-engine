import type { Vec3, Ray } from '@xr-engine/math';
import type { Entity } from '@xr-engine/scene';

export type RigidBodyType = 'static' | 'dynamic' | 'kinematic';

export interface PhysicsMaterial {
  readonly friction?: number;
  readonly restitution?: number;
}

export interface RaycastHit {
  readonly entity: Entity | null;
  readonly point: Vec3;
  readonly normal: Vec3;
  readonly distance: number;
}

export interface CollisionEvent {
  readonly self: RigidBody;
  readonly other: RigidBody;
  readonly contacts: readonly RaycastHit[];
}

export interface TriggerEvent {
  readonly self: Collider;
  readonly other: Collider;
}

export interface Collider {
  readonly id: string;
  readonly entity: Entity | null;
  readonly isTrigger: boolean;
  readonly material?: PhysicsMaterial;
}

export interface BoxCollider extends Collider {
  readonly type: 'box';
  readonly size: Vec3;
}

export interface SphereCollider extends Collider {
  readonly type: 'sphere';
  readonly radius: number;
}

export interface CapsuleCollider extends Collider {
  readonly type: 'capsule';
  readonly radius: number;
  readonly height: number;
}

export interface MeshCollider extends Collider {
  readonly type: 'mesh';
}

export interface RigidBody {
  readonly id: string;
  readonly entity: Entity | null;
  readonly type: RigidBodyType;
  readonly ccdEnabled: boolean;
  applyForce(force: Vec3): void;
  applyImpulse(impulse: Vec3): void;
  setLinearVelocity(velocity: Vec3): void;
  setAngularVelocity(velocity: Vec3): void;
  setKinematic(enabled: boolean): void;
  setCcdEnabled(enabled: boolean): void;
}

export interface CharacterController {
  readonly id: string;
  move(displacement: Vec3): void;
  jump(speed: number): void;
}

export interface PhysicsJoint {
  readonly id: string;
  readonly bodyA: RigidBody;
  readonly bodyB: RigidBody;
  readonly type: 'fixed' | 'hinge' | 'slider';
}

export interface PhysicsConstraint {
  readonly id: string;
  readonly body: RigidBody;
  readonly lockPositionAxes: readonly ('x' | 'y' | 'z')[];
  readonly lockRotationAxes: readonly ('x' | 'y' | 'z')[];
}

export interface PhysicsWorldConfig {
  readonly gravity?: Vec3;
}

export interface PhysicsWorld {
  readonly gravity: Vec3;
  step(deltaTime: number): void;
  raycast(ray: Ray, options?: { maxDistance?: number; mask?: number }): RaycastHit | null;
  overlapSphere(center: Vec3, radius: number): readonly Collider[];
  overlapCapsule(pointA: Vec3, pointB: Vec3, radius: number): readonly Collider[];
  findPinchTargets(center: Vec3, radius?: number): readonly Collider[];
  createRigidBody(config: { entity?: Entity | null; type?: RigidBodyType }): RigidBody;
  createCollider(config: {
    entity?: Entity | null;
    shape: 'box' | 'sphere' | 'capsule' | 'mesh';
    isTrigger?: boolean;
    material?: PhysicsMaterial;
    rigidBody?: RigidBody;
    size?: Vec3;
    radius?: number;
    height?: number;
  }): Collider;
  createCharacterController(config?: { entity?: Entity | null }): CharacterController;
  createJoint(config: {
    bodyA: RigidBody;
    bodyB: RigidBody;
    type: 'fixed' | 'hinge' | 'slider';
  }): PhysicsJoint;
  createConstraint(config: {
    body: RigidBody;
    lockPositionAxes?: readonly ('x' | 'y' | 'z')[];
    lockRotationAxes?: readonly ('x' | 'y' | 'z')[];
  }): PhysicsConstraint;
  consumeCollisionEvents(): readonly CollisionEvent[];
  consumeTriggerEvents(): readonly TriggerEvent[];
}

export declare function createPhysicsWorld(config?: PhysicsWorldConfig): PhysicsWorld;
