import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('testing package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('testing package initialized');
  });
});
