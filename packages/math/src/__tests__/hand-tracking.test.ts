import { describe, expect, it } from 'vitest';
import {
  computeHandOpenness,
  computeJointAngle,
  computePalmForward,
  computePinchDistance,
  computePoseDelta,
  quat,
  vec3,
} from '../index';
import { expectClose, expectQuatClose, expectVec3Close } from './helpers';

describe('Hand tracking helpers', () => {
  it('computes pinch distance from thumb and index tips', () => {
    const distance = computePinchDistance(
      { position: vec3(0, 0, 0), rotation: quat() },
      { position: vec3(0, 3, 4), rotation: quat() }
    );

    expectClose(distance, 5);
  });

  it('computes palm forward direction from wrist to palm', () => {
    const forward = computePalmForward(
      { position: vec3(0, 0, 1), rotation: quat() },
      { position: vec3(0, 0, 0), rotation: quat() }
    );

    expectVec3Close(forward, vec3(0, 0, 1));
  });

  it('computes a joint angle', () => {
    const angle = computeJointAngle(
      { position: vec3(1, 0, 0), rotation: quat() },
      { position: vec3(0, 0, 0), rotation: quat() },
      { position: vec3(0, 1, 0), rotation: quat() }
    );

    expectClose(angle, Math.PI / 2);
  });

  it('computes normalized hand openness for a joint chain', () => {
    const openness = computeHandOpenness([
      { position: vec3(0, 0, 0), rotation: quat() },
      { position: vec3(0, 0, 1), rotation: quat() },
      { position: vec3(0, 0, 2), rotation: quat() },
      { position: vec3(0, 0, 3), rotation: quat() },
    ]);

    expect(openness).toBeGreaterThanOrEqual(0);
    expect(openness).toBeLessThanOrEqual(1);
  });

  it('computes pose deltas', () => {
    const delta = computePoseDelta(
      { position: vec3(1, 2, 3), rotation: quat() },
      { position: vec3(4, 6, 8), rotation: quat(0, 0, 1, 0) }
    );

    expectVec3Close(delta.positionDelta, vec3(3, 4, 5));
    expectQuatClose(delta.rotationDelta, quat(0, 0, 1, 0));
  });
});
