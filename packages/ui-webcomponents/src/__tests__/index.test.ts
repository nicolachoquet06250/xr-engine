import { describe, it, expect } from 'vitest';
import { placeholder } from '../index';

describe('ui-webcomponents package', () => {
  it('should have placeholder string', () => {
    expect(placeholder).toBe('ui-webcomponents package initialized');
  });
});
