import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('gameplay package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('gameplay package initialized');
  });
});
