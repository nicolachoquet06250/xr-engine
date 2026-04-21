import { describe, expect, it } from 'vitest';
import { multiplyQuat, normalizeQuat, quat, quatFromEuler, quatToEuler } from '../index';
import { expectClose, expectQuatClose } from './helpers';

describe('Quaternion operations', () => {
  it('normalizes quaternions', () => {
    const normalized = normalizeQuat(quat(0, 0, 2, 0));
    expectQuatClose(normalized, quat(0, 0, 1, 0));
  });

  it('multiplies identity quaternion without changing the operand', () => {
    const q = quatFromEuler({ x: 0, y: Math.PI / 2, z: 0, order: 'XYZ' });
    expectQuatClose(multiplyQuat(quat(), q), q, 1e-5);
    expectQuatClose(multiplyQuat(q, quat()), q, 1e-5);
  });

  it('round-trips between Euler angles and quaternion', () => {
    const euler = { x: 0.2, y: -0.4, z: 0.6, order: 'XYZ' as const };
    const result = quatToEuler(quatFromEuler(euler));

    expectClose(result.x, euler.x, 1e-5);
    expectClose(result.y, euler.y, 1e-5);
    expectClose(result.z, euler.z, 1e-5);
  });

  it('returns identity when normalizing a zero quaternion', () => {
    expect(normalizeQuat(quat(0, 0, 0, 0))).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
});
