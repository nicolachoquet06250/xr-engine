import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('ui-core package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('ui-core package initialized');
  });
});
