import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('devtools package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('devtools package initialized');
  });
});
