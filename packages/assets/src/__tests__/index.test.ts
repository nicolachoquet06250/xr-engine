import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('assets package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('assets package initialized');
  });
});
