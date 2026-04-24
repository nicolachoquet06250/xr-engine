import { describe, expect, it } from 'vitest';

import { vec3 } from '@xr-engine/math';
import { createScene } from '../../../scene/src/scene-runtime';

import { createPhysicsWorld } from '../index';

describe('physics world integration', () => {
  it('simulates gravity with restitution and friction', () => {
    const scene = createScene('physics');
    const ball = scene.createEntity('ball');
    ball.transform.position = vec3(0, 1, 0);

    const world = createPhysicsWorld({ gravity: vec3(0, -10, 0) });
    const body = world.createRigidBody({ entity: ball, type: 'dynamic' });
    world.createCollider({
      rigidBody: body,
      shape: 'sphere',
      radius: 0.5,
      material: { restitution: 0.3, friction: 0.2 },
    });

    world.step(0.1);
    expect(ball.transform.position.y).toBeLessThan(1);

    for (let i = 0; i < 60; i += 1) world.step(0.1);
    expect(ball.transform.position.y).toBeGreaterThanOrEqual(0);
  });

  it('supports raycasts and trigger events', () => {
    const scene = createScene('physics-events');
    const triggerEntity = scene.createEntity('trigger');
    triggerEntity.transform.position = vec3(0, 0, 0);

    const actorEntity = scene.createEntity('actor');
    actorEntity.transform.position = vec3(0, 0, 0);

    const world = createPhysicsWorld();
    world.createCollider({ entity: triggerEntity, shape: 'sphere', radius: 1, isTrigger: true });

    const body = world.createRigidBody({ entity: actorEntity, type: 'dynamic' });
    world.createCollider({ rigidBody: body, shape: 'sphere', radius: 0.5 });

    const hit = world.raycast({ origin: vec3(-2, 0, 0), direction: vec3(1, 0, 0) });
    expect(hit).not.toBeNull();

    world.step(1 / 60);
    const triggers = world.consumeTriggerEvents();
    expect(triggers.length).toBeGreaterThan(0);
  });

  it('exposes phase 2 APIs and hand interaction helpers', () => {
    const scene = createScene('phase2');
    const e1 = scene.createEntity('a');
    const e2 = scene.createEntity('b');
    e1.transform.position = vec3(0, 0, 0);
    e2.transform.position = vec3(0.04, 0, 0);

    const world = createPhysicsWorld();
    const bodyA = world.createRigidBody({ entity: e1, type: 'dynamic' });
    const bodyB = world.createRigidBody({ entity: e2, type: 'dynamic' });
    bodyA.setCcdEnabled(true);

    const joint = world.createJoint({ bodyA, bodyB, type: 'fixed' });
    const constraint = world.createConstraint({ body: bodyA, lockRotationAxes: ['x', 'z'] });

    expect(joint.id).toContain('joint');
    expect(constraint.lockRotationAxes).toEqual(['x', 'z']);
    expect(bodyA.ccdEnabled).toBe(true);

    world.createCollider({ rigidBody: bodyA, shape: 'sphere', radius: 0.05 });
    world.createCollider({ rigidBody: bodyB, shape: 'sphere', radius: 0.05 });

    const overlaps = world.overlapCapsule(vec3(0, 0, 0), vec3(0.05, 0, 0), 0.05);
    const pinchTargets = world.findPinchTargets(vec3(0, 0, 0), 0.06);
    expect(overlaps.length).toBeGreaterThan(0);
    expect(pinchTargets.length).toBeGreaterThan(0);

    const controller = world.createCharacterController({ entity: e1 });
    controller.move(vec3(0, 1, 0));
    controller.jump(2);
    world.step(1 / 60);
    expect(e1.transform.position.y).toBeGreaterThan(0);
  });
});
