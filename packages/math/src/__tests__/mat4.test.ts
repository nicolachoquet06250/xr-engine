import { describe, expect, it } from 'vitest';
import {
  composeTRS,
  decomposeTRS,
  invertMat4,
  mat4,
  multiplyMat4,
  quatFromEuler,
  transformDirection,
  transformPoint,
  transposeMat4,
  vec3,
} from '../index';
import { expectClose, expectMat4Close, expectQuatClose, expectVec3Close } from './helpers';

describe('Mat4 operations', () => {
  it('multiplies identity matrices', () => {
    expectMat4Close(multiplyMat4(mat4(), mat4()), mat4());
  });

  it('composes and decomposes TRS', () => {
    const trs = {
      translation: vec3(10, -5, 3),
      rotation: quatFromEuler({ x: 0.1, y: 0.2, z: 0.3, order: 'XYZ' }),
      scale: vec3(2, 3, 4),
    };

    const decomposed = decomposeTRS(composeTRS(trs));

    expectVec3Close(decomposed.translation, trs.translation, 1e-5);
    expectQuatClose(decomposed.rotation, trs.rotation, 1e-5);
    expectVec3Close(decomposed.scale, trs.scale, 1e-5);
  });

  it('transforms points and directions correctly for translation-only matrices', () => {
    const matrix = composeTRS({
      translation: vec3(5, 6, 7),
      rotation: quatFromEuler({ x: 0, y: 0, z: 0, order: 'XYZ' }),
      scale: vec3(1, 1, 1),
    });

    expectVec3Close(transformPoint(matrix, vec3(1, 2, 3)), vec3(6, 8, 10));
    expectVec3Close(transformDirection(matrix, vec3(1, 2, 3)), vec3(1, 2, 3));
  });

  it('inverts a composed matrix', () => {
    const matrix = composeTRS({
      translation: vec3(3, 4, 5),
      rotation: quatFromEuler({ x: 0, y: Math.PI / 2, z: 0, order: 'XYZ' }),
      scale: vec3(2, 2, 2),
    });

    const inverse = invertMat4(matrix);
    const point = vec3(2, -1, 4);
    const transformed = transformPoint(matrix, point);
    const restored = transformPoint(inverse, transformed);

    expectVec3Close(restored, point, 1e-5);
  });

  it('transposes matrices', () => {
    const source = mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

    const transposed = transposeMat4(source);
    expect(transposed.elements[1]).toBe(5);
    expect(transposed.elements[4]).toBe(2);
    expect(transposed.elements[11]).toBe(15);
    expect(transposed.elements[14]).toBe(12);
  });

  it('returns identity when inverting the identity matrix', () => {
    const inverted = invertMat4(mat4());
    for (let i = 0; i < 16; i += 1) {
      expectClose(inverted.elements[i]!, mat4().elements[i]!);
    }
  });
});
