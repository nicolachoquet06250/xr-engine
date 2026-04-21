import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('wasm package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('wasm package initialized');
  });
});
