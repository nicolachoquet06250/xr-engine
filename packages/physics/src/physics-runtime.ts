import type {
  CapsuleCollider,
  CharacterController,
  Collider,
  CollisionEvent,
  PhysicsConstraint,
  PhysicsJoint,
  PhysicsMaterial,
  PhysicsWorld,
  PhysicsWorldConfig,
  RaycastHit,
  RigidBody,
  RigidBodyType,
  TriggerEvent,
} from './physics';
import type { Entity } from '@xr-engine/scene';
type Shape = 'box' | 'sphere' | 'capsule' | 'mesh';

import {
  addVec3,
  dotVec3,
  lengthVec3,
  normalizeVec3,
  scaleVec3,
  subVec3,
  vec3,
} from '@xr-engine/math';

type MutableVec3 = { x: number; y: number; z: number };

type RigidBodyState = {
  id: string;
  entity: Entity | null;
  type: RigidBodyType;
  linearVelocity: MutableVec3;
  angularVelocity: MutableVec3;
  accumulatedForce: MutableVec3;
  kinematic: boolean;
  ccdEnabled: boolean;
};

type ColliderState = {
  id: string;
  entity: Entity | null;
  shape: Shape;
  isTrigger: boolean;
  material: PhysicsMaterial | undefined;
  rigidBody: RigidBodyState | null;
  radius: number;
  size: MutableVec3;
  height: number;
};

let rigidBodySequence = 0;
let colliderSequence = 0;
let controllerSequence = 0;
let jointSequence = 0;
let constraintSequence = 0;

function nextId(prefix: string, sequence: number): string {
  return `${prefix}-${sequence}`;
}

function clonePosition(entity: Entity | null): MutableVec3 {
  const p = entity?.transform.position;
  return { x: p?.x ?? 0, y: p?.y ?? 0, z: p?.z ?? 0 };
}

function writePosition(entity: Entity | null, position: MutableVec3): void {
  if (!entity) return;
  entity.transform.position = vec3(position.x, position.y, position.z);
}

function sphereRadius(collider: ColliderState): number {
  switch (collider.shape) {
    case 'sphere':
      return collider.radius;
    case 'capsule':
      return collider.radius + collider.height * 0.5;
    case 'box':
      return Math.max(collider.size.x, collider.size.y, collider.size.z) * 0.5;
    case 'mesh':
      return 0.75;
  }
}

function colliderCenter(collider: ColliderState): MutableVec3 {
  return clonePosition(collider.entity ?? collider.rigidBody?.entity ?? null);
}

function intersectsSphere(collider: ColliderState, center: MutableVec3, radius: number): boolean {
  const c = colliderCenter(collider);
  const dx = c.x - center.x;
  const dy = c.y - center.y;
  const dz = c.z - center.z;
  const sum = sphereRadius(collider) + radius;
  return dx * dx + dy * dy + dz * dz <= sum * sum;
}

class RigidBodyImpl implements RigidBody {
  public constructor(private readonly state: RigidBodyState) {}

  public get id(): string {
    return this.state.id;
  }

  public get entity(): Entity | null {
    return this.state.entity;
  }

  public get type(): RigidBodyType {
    return this.state.type;
  }

  public applyForce(force: { x: number; y: number; z: number }): void {
    this.state.accumulatedForce.x += force.x;
    this.state.accumulatedForce.y += force.y;
    this.state.accumulatedForce.z += force.z;
  }

  public applyImpulse(impulse: { x: number; y: number; z: number }): void {
    this.state.linearVelocity.x += impulse.x;
    this.state.linearVelocity.y += impulse.y;
    this.state.linearVelocity.z += impulse.z;
  }

  public setLinearVelocity(velocity: { x: number; y: number; z: number }): void {
    this.state.linearVelocity = { x: velocity.x, y: velocity.y, z: velocity.z };
  }

  public setAngularVelocity(velocity: { x: number; y: number; z: number }): void {
    this.state.angularVelocity = { x: velocity.x, y: velocity.y, z: velocity.z };
  }

  public setKinematic(enabled: boolean): void {
    this.state.kinematic = enabled;
    this.state.type = enabled
      ? 'kinematic'
      : this.state.type === 'kinematic'
        ? 'dynamic'
        : this.state.type;
  }

  public setCcdEnabled(enabled: boolean): void {
    this.state.ccdEnabled = enabled;
  }

  public get ccdEnabled(): boolean {
    return this.state.ccdEnabled;
  }
}

class CharacterControllerImpl implements CharacterController {
  public constructor(
    public readonly id: string,
    private readonly body: RigidBodyImpl
  ) {}

  public move(displacement: { x: number; y: number; z: number }): void {
    const current = clonePosition(this.body.entity);
    writePosition(this.body.entity, {
      x: current.x + displacement.x,
      y: current.y + displacement.y,
      z: current.z + displacement.z,
    });
  }

  public jump(speed: number): void {
    this.body.applyImpulse(vec3(0, Math.max(0, speed), 0));
  }
}

class PhysicsWorldImpl implements PhysicsWorld {
  public readonly gravity;
  private readonly bodies = new Map<string, RigidBodyState>();
  private readonly colliders = new Map<string, ColliderState>();
  private readonly collisionEvents: CollisionEvent[] = [];
  private readonly triggerEvents: TriggerEvent[] = [];
  private readonly joints = new Map<string, PhysicsJoint>();
  private readonly constraints = new Map<string, PhysicsConstraint>();

  public constructor(config?: PhysicsWorldConfig) {
    this.gravity = config?.gravity ?? vec3(0, -9.81, 0);
  }

  public step(deltaTime: number): void {
    this.collisionEvents.length = 0;
    this.triggerEvents.length = 0;

    for (const body of this.bodies.values()) {
      if (body.type !== 'dynamic' || body.kinematic) continue;

      body.linearVelocity.x += (this.gravity.x + body.accumulatedForce.x) * deltaTime;
      body.linearVelocity.y += (this.gravity.y + body.accumulatedForce.y) * deltaTime;
      body.linearVelocity.z += (this.gravity.z + body.accumulatedForce.z) * deltaTime;

      const current = clonePosition(body.entity);
      const next = {
        x: current.x + body.linearVelocity.x * deltaTime,
        y: current.y + body.linearVelocity.y * deltaTime,
        z: current.z + body.linearVelocity.z * deltaTime,
      };

      if (body.ccdEnabled && current.y > 0 && next.y < 0) {
        next.y = 0;
      }

      if (next.y < 0) {
        const bodyCollider = [...this.colliders.values()].find(
          (candidate) => candidate.rigidBody === body
        );
        const material = bodyCollider?.material;
        const restitution = Math.max(0, Math.min(1, material?.restitution ?? 0.1));
        const friction = Math.max(0, Math.min(1, material?.friction ?? 0.5));

        next.y = 0;
        body.linearVelocity.y = -body.linearVelocity.y * restitution;
        body.linearVelocity.x *= 1 - friction;
        body.linearVelocity.z *= 1 - friction;
      }

      writePosition(body.entity, next);
      body.accumulatedForce = { x: 0, y: 0, z: 0 };
    }

    const list = [...this.colliders.values()];
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (!intersectsSphere(a, colliderCenter(b), sphereRadius(b))) continue;

        if (a.isTrigger || b.isTrigger) {
          this.triggerEvents.push({ self: this.toCollider(a), other: this.toCollider(b) });
          continue;
        }

        const hit = this.createContactHit(a, b);
        if (!hit) continue;
        const aBody = a.rigidBody ? new RigidBodyImpl(a.rigidBody) : null;
        const bBody = b.rigidBody ? new RigidBodyImpl(b.rigidBody) : null;
        if (!aBody || !bBody) continue;
        this.collisionEvents.push({ self: aBody, other: bBody, contacts: [hit] });
      }
    }
  }

  public raycast(
    ray: {
      origin: { x: number; y: number; z: number };
      direction: { x: number; y: number; z: number };
    },
    options?: { maxDistance?: number }
  ): RaycastHit | null {
    const maxDistance = options?.maxDistance ?? Infinity;
    const normalizedDirection = normalizeVec3(ray.direction);
    let closest: RaycastHit | null = null;

    for (const collider of this.colliders.values()) {
      const center = colliderCenter(collider);
      const toCenter = subVec3(vec3(center.x, center.y, center.z), ray.origin);
      const projection = dotVec3(toCenter, normalizedDirection);
      if (projection < 0 || projection > maxDistance) continue;

      const closestPoint = addVec3(ray.origin, scaleVec3(normalizedDirection, projection));
      const distance = lengthVec3(subVec3(vec3(center.x, center.y, center.z), closestPoint));
      const radius = sphereRadius(collider);
      if (distance > radius) continue;

      const normal = normalizeVec3(subVec3(closestPoint, vec3(center.x, center.y, center.z)));
      const hit: RaycastHit = {
        entity: collider.entity,
        point: closestPoint,
        normal,
        distance: projection,
      };
      if (!closest || hit.distance < closest.distance) {
        closest = hit;
      }
    }

    return closest;
  }

  public overlapSphere(
    center: { x: number; y: number; z: number },
    radius: number
  ): readonly Collider[] {
    return Object.freeze(
      [...this.colliders.values()]
        .filter((collider) => intersectsSphere(collider, center, radius))
        .map((collider) => this.toCollider(collider))
    );
  }

  public overlapCapsule(
    pointA: { x: number; y: number; z: number },
    pointB: { x: number; y: number; z: number },
    radius: number
  ): readonly Collider[] {
    const mid = vec3(
      (pointA.x + pointB.x) * 0.5,
      (pointA.y + pointB.y) * 0.5,
      (pointA.z + pointB.z) * 0.5
    );
    const extent = lengthVec3(subVec3(pointB, pointA)) * 0.5;
    return this.overlapSphere(mid, radius + extent);
  }

  public findPinchTargets(
    center: { x: number; y: number; z: number },
    radius = 0.03
  ): readonly Collider[] {
    return this.overlapSphere(center, radius);
  }

  public createRigidBody(config: { entity?: Entity | null; type?: RigidBodyType }): RigidBody {
    rigidBodySequence += 1;
    const state: RigidBodyState = {
      id: nextId('rigid-body', rigidBodySequence),
      entity: config.entity ?? null,
      type: config.type ?? 'dynamic',
      linearVelocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      accumulatedForce: { x: 0, y: 0, z: 0 },
      kinematic: (config.type ?? 'dynamic') === 'kinematic',
      ccdEnabled: false,
    };
    this.bodies.set(state.id, state);
    return new RigidBodyImpl(state);
  }

  public createCollider(config: {
    entity?: Entity | null;
    shape: 'box' | 'sphere' | 'capsule' | 'mesh';
    isTrigger?: boolean;
    material?: PhysicsMaterial;
    rigidBody?: RigidBody;
    size?: { x: number; y: number; z: number };
    radius?: number;
    height?: number;
  }): Collider {
    colliderSequence += 1;
    const bodyState = config.rigidBody ? (this.bodies.get(config.rigidBody.id) ?? null) : null;
    const state: ColliderState = {
      id: nextId('collider', colliderSequence),
      entity: config.entity ?? bodyState?.entity ?? null,
      shape: config.shape,
      isTrigger: config.isTrigger ?? false,
      material: config.material,
      rigidBody: bodyState,
      size: { x: config.size?.x ?? 1, y: config.size?.y ?? 1, z: config.size?.z ?? 1 },
      radius: config.radius ?? 0.5,
      height: config.height ?? 1,
    };
    this.colliders.set(state.id, state);
    return this.toCollider(state);
  }

  public createCharacterController(config?: { entity?: Entity | null }): CharacterController {
    controllerSequence += 1;
    const body = this.createRigidBody({ entity: config?.entity ?? null, type: 'kinematic' });
    return new CharacterControllerImpl(
      nextId('character-controller', controllerSequence),
      body as RigidBodyImpl
    );
  }

  public createJoint(config: {
    bodyA: RigidBody;
    bodyB: RigidBody;
    type: 'fixed' | 'hinge' | 'slider';
  }): PhysicsJoint {
    jointSequence += 1;
    const joint: PhysicsJoint = { id: nextId('joint', jointSequence), ...config };
    this.joints.set(joint.id, joint);
    return joint;
  }

  public createConstraint(config: {
    body: RigidBody;
    lockPositionAxes?: readonly ('x' | 'y' | 'z')[];
    lockRotationAxes?: readonly ('x' | 'y' | 'z')[];
  }): PhysicsConstraint {
    constraintSequence += 1;
    const constraint: PhysicsConstraint = {
      id: nextId('constraint', constraintSequence),
      body: config.body,
      lockPositionAxes: config.lockPositionAxes ?? [],
      lockRotationAxes: config.lockRotationAxes ?? [],
    };
    this.constraints.set(constraint.id, constraint);
    return constraint;
  }

  public consumeCollisionEvents(): readonly CollisionEvent[] {
    return Object.freeze([...this.collisionEvents]);
  }

  public consumeTriggerEvents(): readonly TriggerEvent[] {
    return Object.freeze([...this.triggerEvents]);
  }

  private createContactHit(self: ColliderState, other: ColliderState): RaycastHit | null {
    const selfCenter = colliderCenter(self);
    const otherCenter = colliderCenter(other);
    const direction = subVec3(
      vec3(otherCenter.x, otherCenter.y, otherCenter.z),
      vec3(selfCenter.x, selfCenter.y, selfCenter.z)
    );
    const normal = normalizeVec3(direction);
    if (lengthVec3(normal) === 0) return null;

    return {
      entity: other.entity,
      point: vec3(
        (selfCenter.x + otherCenter.x) * 0.5,
        (selfCenter.y + otherCenter.y) * 0.5,
        (selfCenter.z + otherCenter.z) * 0.5
      ),
      normal,
      distance: lengthVec3(direction),
    };
  }

  private toCollider(state: ColliderState): Collider {
    const base = {
      id: state.id,
      entity: state.entity,
      isTrigger: state.isTrigger,
      material: state.material,
    };

    if (state.shape === 'box')
      return Object.freeze({
        ...base,
        type: 'box',
        size: vec3(state.size.x, state.size.y, state.size.z),
      });
    if (state.shape === 'sphere')
      return Object.freeze({ ...base, type: 'sphere', radius: state.radius });
    if (state.shape === 'capsule') {
      const capsule: CapsuleCollider = {
        ...base,
        type: 'capsule',
        radius: state.radius,
        height: state.height,
      };
      return Object.freeze(capsule);
    }

    return Object.freeze({ ...base, type: 'mesh' });
  }
}

export function createPhysicsWorld(config?: PhysicsWorldConfig): PhysicsWorld {
  return new PhysicsWorldImpl(config);
}
