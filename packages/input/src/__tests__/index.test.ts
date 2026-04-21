import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('input package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('input package initialized');
  });
});
