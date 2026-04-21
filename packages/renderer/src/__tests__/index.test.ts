import { describe, it, expect } from 'vitest';
import { createRenderer, RendererBackend, WebGL2Renderer } from '../index';

describe('renderer module', () => {
  it('creates a WebGL2 renderer instance when requested', () => {
    const renderer = createRenderer(RendererBackend.WebGL2);
    expect(renderer).toBeInstanceOf(WebGL2Renderer);
    // the returned renderer should expose the required methods
    expect(typeof (renderer as any).initialize).toBe('function');
    expect(typeof (renderer as any).clear).toBe('function');
    expect(typeof (renderer as any).present).toBe('function');
    expect(typeof (renderer as any).dispose).toBe('function');
  });
});
