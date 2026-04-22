import { describe, expect, it } from 'vitest';
import {
  intersectFrustumAABB,
  intersectRayAABB,
  intersectRayPlane,
  intersectRaySphere,
  vec3,
} from '../math-runtime';
import { expectClose } from './helpers';

describe('Intersection helpers', () => {
  it('computes ray-plane intersection distance', () => {
    const distance = intersectRayPlane(
      { origin: vec3(0, 5, 0), direction: vec3(0, -1, 0) },
      { normal: vec3(0, 1, 0), constant: 0 }
    );

    expect(distance).not.toBeNull();
    expectClose(distance!, 5);
  });

  it('returns null for parallel ray-plane intersection', () => {
    expect(
      intersectRayPlane(
        { origin: vec3(0, 5, 0), direction: vec3(1, 0, 0) },
        { normal: vec3(0, 1, 0), constant: 0 }
      )
    ).toBeNull();
  });

  it('computes ray-sphere intersection distance', () => {
    const distance = intersectRaySphere(
      { origin: vec3(0, 0, -5), direction: vec3(0, 0, 1) },
      { center: vec3(0, 0, 0), radius: 1 }
    );

    expect(distance).not.toBeNull();
    expectClose(distance!, 4);
  });

  it('computes ray-aabb intersection distance', () => {
    const distance = intersectRayAABB(
      { origin: vec3(-5, 0, 0), direction: vec3(1, 0, 0) },
      { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) }
    );

    expect(distance).not.toBeNull();
    expectClose(distance!, 4);
  });

  it('tests whether an aabb is inside a frustum', () => {
    const frustum = {
      planes: [
        { normal: vec3(1, 0, 0), constant: 1 },
        { normal: vec3(-1, 0, 0), constant: 1 },
        { normal: vec3(0, 1, 0), constant: 1 },
        { normal: vec3(0, -1, 0), constant: 1 },
        { normal: vec3(0, 0, 1), constant: 1 },
        { normal: vec3(0, 0, -1), constant: 1 },
      ] as const,
    };

    expect(
      intersectFrustumAABB(frustum, { min: vec3(-0.5, -0.5, -0.5), max: vec3(0.5, 0.5, 0.5) })
    ).toBe(true);
    expect(intersectFrustumAABB(frustum, { min: vec3(2, 2, 2), max: vec3(3, 3, 3) })).toBe(false);
  });
});
