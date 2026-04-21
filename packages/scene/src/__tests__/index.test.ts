import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('scene package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('scene package initialized');
  });
});
