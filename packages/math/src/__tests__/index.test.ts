import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('math package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('math package initialized');
  });
});
