import { expect } from 'vitest'
import type { Mat4, Quat, Vec2, Vec3 } from '../math';

export const EPSILON = 1e-6;

export function expectClose(actual: number, expected: number, epsilon = EPSILON): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(epsilon);
}

export function expectVec2Close(actual: Vec2, expected: Vec2, epsilon = EPSILON): void {
  expectClose(actual.x, expected.x, epsilon);
  expectClose(actual.y, expected.y, epsilon);
}

export function expectVec3Close(actual: Vec3, expected: Vec3, epsilon = EPSILON): void {
  expectClose(actual.x, expected.x, epsilon);
  expectClose(actual.y, expected.y, epsilon);
  expectClose(actual.z, expected.z, epsilon);
}

export function expectQuatClose(actual: Quat, expected: Quat, epsilon = EPSILON): void {
  expectClose(actual.x, expected.x, epsilon);
  expectClose(actual.y, expected.y, epsilon);
  expectClose(actual.z, expected.z, epsilon);
  expectClose(actual.w, expected.w, epsilon);
}

export function expectMat4Close(actual: Mat4, expected: Mat4, epsilon = EPSILON): void {
  expect(actual.elements).toHaveLength(16);
  expect(expected.elements).toHaveLength(16);

  for (let i = 0; i < 16; i += 1) {
    expectClose(actual.elements[i]!, expected.elements[i]!, epsilon);
  }
}
