import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('audio package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('audio package initialized');
  });
});
