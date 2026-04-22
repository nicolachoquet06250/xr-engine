import { describe, expect, it } from 'vitest';
import {
  addVec3,
  crossVec3,
  distanceVec3,
  dotVec3,
  lengthVec3,
  lerpVec3,
  normalizeVec3,
  scaleVec3,
  subVec3,
  vec3,
} from '../math-runtime';
import { expectVec3Close } from './helpers';

describe('Vec3 operations', () => {
  it('adds, subtracts and scales vectors', () => {
    expect(addVec3(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
    expect(subVec3(vec3(7, 8, 9), vec3(1, 2, 3))).toEqual({ x: 6, y: 6, z: 6 });
    expect(scaleVec3(vec3(1, -2, 3), 2)).toEqual({ x: 2, y: -4, z: 6 });
  });

  it('computes dot and cross products', () => {
    expect(dotVec3(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(32);
    expect(crossVec3(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('computes length, distance and lerp', () => {
    expect(lengthVec3(vec3(2, 3, 6))).toBe(7);
    expect(distanceVec3(vec3(0, 0, 0), vec3(1, 2, 2))).toBe(3);
    expect(lerpVec3(vec3(0, 0, 0), vec3(10, 20, 30), 0.25)).toEqual({ x: 2.5, y: 5, z: 7.5 });
  });

  it('normalizes vectors', () => {
    expectVec3Close(normalizeVec3(vec3(0, 3, 4)), vec3(0, 0.6, 0.8));
  });

  it('returns zero when normalizing zero vector', () => {
    expect(normalizeVec3(vec3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
  });
});
