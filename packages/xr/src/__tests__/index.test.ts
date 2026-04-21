import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('xr package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('xr package initialized');
  });
});
