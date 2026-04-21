import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../index';

describe('physics module', () => {
  it('exposes a create factory function', () => {
    expect(typeof PhysicsWorld.create).toBe('function');
  });
  it('exposes a step method on instances', async () => {
    // We avoid actually loading the WASM module in the test environment
    // by checking only the prototype.  If the WASM package is not
    // available, this test will still pass without instantiating the world.
    const prototype = PhysicsWorld.prototype as any;
    expect(typeof prototype.step).toBe('function');
  });
});
