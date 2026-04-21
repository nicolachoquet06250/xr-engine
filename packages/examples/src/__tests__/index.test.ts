import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('examples package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('examples package initialized');
  });
});
