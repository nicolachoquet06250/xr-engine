import { describe, expect, it } from 'vitest';
import { mat3, mat4, quat, vec2, vec3, vec4 } from '../index';

describe('math constructors', () => {
  it('creates zero vectors by default', () => {
    expect(vec2()).toEqual({ x: 0, y: 0 });
    expect(vec3()).toEqual({ x: 0, y: 0, z: 0 });
    expect(vec4()).toEqual({ x: 0, y: 0, z: 0, w: 0 });
  });

  it('creates vectors with explicit values', () => {
    expect(vec2(1, 2)).toEqual({ x: 1, y: 2 });
    expect(vec3(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });
    expect(vec4(1, 2, 3, 4)).toEqual({ x: 1, y: 2, z: 3, w: 4 });
  });

  it('creates identity quaternion by default', () => {
    expect(quat()).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('creates mat3 and mat4 with expected element counts', () => {
    expect(mat3().elements).toHaveLength(9);
    expect(mat4().elements).toHaveLength(16);
  });
});
