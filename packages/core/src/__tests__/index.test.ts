import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('core package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('core package initialized');
  });
});
