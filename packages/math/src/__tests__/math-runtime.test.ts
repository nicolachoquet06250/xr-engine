import { describe, expect, it } from 'vitest';
import {
  addVec2,
  addVec3,
  composeTRS,
  computeHandOpenness,
  computeJointAngle,
  computePalmForward,
  computePinchDistance,
  computePoseDelta,
  crossVec3,
  decomposeTRS,
  distanceVec3,
  dotVec2,
  dotVec3,
  intersectFrustumAABB,
  intersectRayAABB,
  intersectRayPlane,
  intersectRaySphere,
  invertMat4,
  lengthVec2,
  lengthVec3,
  lerpVec3,
  mat3,
  mat4,
  multiplyMat4,
  multiplyQuat,
  normalizeQuat,
  normalizeVec2,
  normalizeVec3,
  quat,
  quatFromEuler,
  quatToEuler,
  scaleVec2,
  scaleVec3,
  slerpQuat,
  subVec2,
  subVec3,
  transformDirection,
  transformPoint,
  transposeMat4,
  vec2,
  vec3,
  vec4,
} from '../math-runtime';
import type { Frustum, HandJointPose, Plane } from '../math';

const EPS = 1e-5;

function expectVec2Close(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  precision = 5
): void {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
}

function expectVec3Close(
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number },
  precision = 5
): void {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
}

function expectQuatClose(
  actual: { x: number; y: number; z: number; w: number },
  expected: { x: number; y: number; z: number; w: number },
  precision = 5
): void {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
  expect(actual.w).toBeCloseTo(expected.w, precision);
}

function expectMat4Close(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  precision = 5
): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i += 1) {
    expect(actual[i]).toBeCloseTo(expected[i], precision);
  }
}

function plane(normal: ReturnType<typeof vec3>, constant: number): Plane {
  return { normal, constant };
}

function joint(position: ReturnType<typeof vec3>, rotation = quat()): HandJointPose {
  return { position, rotation };
}

describe('math constructors', () => {
  it('creates immutable vectors, quaternions and matrices with expected defaults', () => {
    expectVec2Close(vec2(), { x: 0, y: 0 });
    expectVec3Close(vec3(), { x: 0, y: 0, z: 0 });
    expect(vec4()).toEqual({ x: 0, y: 0, z: 0, w: 0 });
    expect(quat()).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(Array.from(mat3().elements)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(Array.from(mat4().elements)).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(Object.isFrozen(vec2(1, 2))).toBe(true);
    expect(Object.isFrozen(vec3(1, 2, 3))).toBe(true);
    expect(Object.isFrozen(quat())).toBe(true);
  });

  it('copies numeric arrays into matrices', () => {
    const m = mat4(new Float32Array([1, 2, 3, 4]));
    expect(Array.from(m.elements)).toEqual([1, 2, 3, 4, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  });
});

describe('vec2 operations', () => {
  it('adds, subtracts and scales vectors', () => {
    expect(addVec2(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
    expect(subVec2(vec2(5, 6), vec2(2, 1))).toEqual({ x: 3, y: 5 });
    expect(scaleVec2(vec2(2, -3), 4)).toEqual({ x: 8, y: -12 });
  });

  it('computes dot product, length and normalization', () => {
    expect(dotVec2(vec2(1, 2), vec2(3, 4))).toBe(11);
    expect(lengthVec2(vec2(3, 4))).toBe(5);
    expectVec2Close(normalizeVec2(vec2(3, 4)), { x: 0.6, y: 0.8 });
    expect(normalizeVec2(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });
});

describe('vec3 operations', () => {
  it('adds, subtracts, scales and interpolates vectors', () => {
    expect(addVec3(vec3(1, 2, 3), vec3(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
    expect(subVec3(vec3(7, 9, 11), vec3(1, 2, 3))).toEqual({ x: 6, y: 7, z: 8 });
    expect(scaleVec3(vec3(2, -3, 4), 2)).toEqual({ x: 4, y: -6, z: 8 });
    expect(lerpVec3(vec3(0, 0, 0), vec3(10, 20, 30), 0.25)).toEqual({ x: 2.5, y: 5, z: 7.5 });
  });

  it('computes dot, cross, length, normalization and distance', () => {
    expect(dotVec3(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(32);
    expect(crossVec3(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual({ x: 0, y: 0, z: 1 });
    expect(lengthVec3(vec3(2, 3, 6))).toBe(7);
    expectVec3Close(normalizeVec3(vec3(0, 0, 5)), { x: 0, y: 0, z: 1 });
    expect(normalizeVec3(vec3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
    expect(distanceVec3(vec3(1, 2, 3), vec3(4, 6, 3))).toBe(5);
  });
});

describe('quaternions', () => {
  it('normalizes and multiplies quaternions', () => {
    expect(normalizeQuat(quat(0, 0, 0, 0))).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    const ninetyZ = quatFromEuler({ x: 0, y: 0, z: Math.PI / 2 });
    const oneEightyZ = multiplyQuat(ninetyZ, ninetyZ);
    const direction = transformDirection(
      composeTRS({ translation: vec3(), rotation: oneEightyZ, scale: vec3(1, 1, 1) }),
      vec3(1, 0, 0)
    );
    expectVec3Close(direction, { x: -1, y: 0, z: 0 }, 4);
  });

  it('slerps quaternions smoothly', () => {
    const start = quat();
    const end = quatFromEuler({ x: 0, y: 0, z: Math.PI });
    const halfway = slerpQuat(start, end, 0.5);
    const direction = transformDirection(
      composeTRS({ translation: vec3(), rotation: halfway, scale: vec3(1, 1, 1) }),
      vec3(1, 0, 0)
    );
    expectVec3Close(direction, { x: 0, y: 1, z: 0 }, 4);
  });

  it('converts between euler angles and quaternions', () => {
    const euler = { x: 0.2, y: -0.3, z: 0.4, order: 'XYZ' as const };
    const q = quatFromEuler(euler);
    const roundTrip = quatToEuler(q);
    expect(roundTrip.order).toBe('XYZ');
    expect(roundTrip.x).toBeCloseTo(euler.x, 4);
    expect(roundTrip.y).toBeCloseTo(euler.y, 4);
    expect(roundTrip.z).toBeCloseTo(euler.z, 4);
  });
});

describe('mat4 operations', () => {
  it('multiplies matrices and transposes matrices', () => {
    const translation = composeTRS({
      translation: vec3(3, 4, 5),
      rotation: quat(),
      scale: vec3(1, 1, 1),
    });
    const scale = composeTRS({ translation: vec3(), rotation: quat(), scale: vec3(2, 3, 4) });
    const combined = multiplyMat4(translation, scale);
    expectVec3Close(transformPoint(combined, vec3(1, 1, 1)), { x: 5, y: 7, z: 9 });

    const transposed = transposeMat4(mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]));
    expect(Array.from(transposed.elements)).toEqual([
      1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16,
    ]);
  });

  it('inverts matrices', () => {
    const matrix = composeTRS({
      translation: vec3(10, -4, 2),
      rotation: quatFromEuler({ x: 0, y: 0, z: Math.PI / 2 }),
      scale: vec3(2, 2, 2),
    });
    const inverse = invertMat4(matrix);
    const product = multiplyMat4(matrix, inverse);
    expectMat4Close(product.elements, mat4().elements, 4);
  });

  it('composes and decomposes translation-rotation-scale', () => {
    const trs = {
      translation: vec3(1, 2, 3),
      rotation: quatFromEuler({ x: 0, y: 0, z: Math.PI / 2 }),
      scale: vec3(2, 3, 4),
    };
    const matrix = composeTRS(trs);
    expectVec3Close(transformPoint(matrix, vec3(1, 0, 0)), { x: 1, y: 4, z: 3 }, 4);

    const decomposed = decomposeTRS(matrix);
    expectVec3Close(decomposed.translation, trs.translation);
    expectVec3Close(decomposed.scale, trs.scale);
    const forward = transformDirection(
      composeTRS({ translation: vec3(), rotation: decomposed.rotation, scale: vec3(1, 1, 1) }),
      vec3(1, 0, 0)
    );
    expectVec3Close(forward, { x: 0, y: 1, z: 0 }, 4);
  });

  it('transforms points and directions correctly', () => {
    const matrix = composeTRS({
      translation: vec3(10, 0, 0),
      rotation: quatFromEuler({ x: 0, y: 0, z: Math.PI / 2 }),
      scale: vec3(1, 1, 1),
    });
    expectVec3Close(transformPoint(matrix, vec3(1, 0, 0)), { x: 10, y: 1, z: 0 }, 4);
    expectVec3Close(transformDirection(matrix, vec3(1, 0, 0)), { x: 0, y: 1, z: 0 }, 4);
  });
});

describe('intersections', () => {
  it('intersects a ray with a plane', () => {
    const t = intersectRayPlane(
      { origin: vec3(0, 0, 0), direction: vec3(0, 0, 1) },
      { normal: vec3(0, 0, 1), constant: -5 }
    );
    expect(t).toBe(5);
    expect(
      intersectRayPlane(
        { origin: vec3(0, 0, 0), direction: vec3(1, 0, 0) },
        { normal: vec3(0, 0, 1), constant: -5 }
      )
    ).toBeNull();
  });

  it('intersects a ray with a sphere', () => {
    const t = intersectRaySphere(
      { origin: vec3(0, 0, -10), direction: vec3(0, 0, 1) },
      { center: vec3(0, 0, 0), radius: 2 }
    );
    expect(t).toBeCloseTo(8, 5);
    expect(
      intersectRaySphere(
        { origin: vec3(0, 0, -10), direction: vec3(0, 1, 0) },
        { center: vec3(0, 0, 0), radius: 2 }
      )
    ).toBeNull();
  });

  it('intersects a ray with an axis-aligned bounding box', () => {
    const aabb = { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) };
    expect(
      intersectRayAABB({ origin: vec3(-5, 0, 0), direction: vec3(1, 0, 0) }, aabb)
    ).toBeCloseTo(4, 5);
    expect(intersectRayAABB({ origin: vec3(0, 2, 0), direction: vec3(1, 0, 0) }, aabb)).toBeNull();
  });

  it('tests a frustum against an axis-aligned bounding box', () => {
    const frustum: Frustum = {
      planes: [
        plane(vec3(1, 0, 0), 1),
        plane(vec3(-1, 0, 0), 1),
        plane(vec3(0, 1, 0), 1),
        plane(vec3(0, -1, 0), 1),
        plane(vec3(0, 0, 1), 1),
        plane(vec3(0, 0, -1), 1),
      ],
    };

    expect(
      intersectFrustumAABB(frustum, { min: vec3(-0.5, -0.5, -0.5), max: vec3(0.5, 0.5, 0.5) })
    ).toBe(true);
    expect(intersectFrustumAABB(frustum, { min: vec3(2, 2, 2), max: vec3(3, 3, 3) })).toBe(false);
  });
});

describe('hand tracking helpers', () => {
  it('computes pinch distance and palm forward vector', () => {
    expect(computePinchDistance(joint(vec3(0, 0, 0)), joint(vec3(0, 0.03, 0.04)))).toBeCloseTo(
      0.05,
      5
    );
    expectVec3Close(computePalmForward(joint(vec3(0, 0, 1)), joint(vec3(0, 0, 0))), {
      x: 0,
      y: 0,
      z: 1,
    });
  });

  it('computes joint angle and pose delta', () => {
    const angle = computeJointAngle(
      joint(vec3(1, 0, 0)),
      joint(vec3(0, 0, 0)),
      joint(vec3(0, 1, 0))
    );
    expect(angle).toBeCloseTo(Math.PI / 2, 5);

    const delta = computePoseDelta(
      joint(vec3(1, 2, 3), quat()),
      joint(vec3(2, 4, 6), quatFromEuler({ x: 0, y: 0, z: Math.PI / 2 }))
    );

    expectVec3Close(delta.positionDelta, { x: 1, y: 2, z: 3 });
    const rotated = transformDirection(
      composeTRS({ translation: vec3(), rotation: delta.rotationDelta, scale: vec3(1, 1, 1) }),
      vec3(1, 0, 0)
    );
    expectVec3Close(rotated, { x: 0, y: 1, z: 0 }, 4);
  });

  it('computes hand openness in a normalized range', () => {
    const closed = [joint(vec3(0, 0, 0)), joint(vec3(0.002, 0, 0)), joint(vec3(0, 0.002, 0))];
    const open = [
      joint(vec3(-0.08, 0, 0)),
      joint(vec3(0.08, 0, 0)),
      joint(vec3(0, 0.08, 0)),
      joint(vec3(0, -0.08, 0)),
    ];

    const closedValue = computeHandOpenness(closed);
    const openValue = computeHandOpenness(open);

    expect(closedValue).toBeGreaterThanOrEqual(0);
    expect(closedValue).toBeLessThanOrEqual(1);
    expect(openValue).toBeGreaterThanOrEqual(0);
    expect(openValue).toBeLessThanOrEqual(1);
    expect(openValue).toBeGreaterThan(closedValue);
    expect(computeHandOpenness([])).toBe(0);
  });
});
