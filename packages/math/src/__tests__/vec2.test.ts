import { describe, expect, it } from 'vitest';
import {
  addVec2,
  dotVec2,
  lengthVec2,
  normalizeVec2,
  scaleVec2,
  subVec2,
  vec2,
} from '../math-runtime';
import { expectVec2Close } from './helpers';

describe('Vec2 operations', () => {
  it('adds and subtracts vectors', () => {
    expect(addVec2(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
    expect(subVec2(vec2(5, 8), vec2(2, 3))).toEqual({ x: 3, y: 5 });
  });

  it('scales vectors', () => {
    expect(scaleVec2(vec2(2, -3), 4)).toEqual({ x: 8, y: -12 });
  });

  it('computes dot product and length', () => {
    expect(dotVec2(vec2(1, 2), vec2(3, 4))).toBe(11);
    expect(lengthVec2(vec2(3, 4))).toBe(5);
  });

  it('normalizes non-zero vectors', () => {
    expectVec2Close(normalizeVec2(vec2(3, 4)), vec2(0.6, 0.8));
  });

  it('returns the zero vector when normalizing zero', () => {
    expect(normalizeVec2(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });
});
