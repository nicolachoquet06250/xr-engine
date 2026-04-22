import { describe, expect, it, vi } from 'vitest';

import {
  createEngine,
  createRuntimeEventBus,
  createServiceToken,
  type EngineSystem,
  type FrameInfo,
  type RuntimeContext,
} from '../index';

function createSystem(id: string, hooks: Partial<EngineSystem> = {}): EngineSystem {
  return {
    id,
    dispose: vi.fn(),
    ...hooks,
  };
}

describe('runtime event bus', () => {
  it('subscribes and emits by category', () => {
    const bus = createRuntimeEventBus();
    const listener = vi.fn();

    bus.on('runtime', listener);
    bus.emit({ category: 'runtime', type: 'frame', timestamp: 1, frame: 2, payload: { ok: true } });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'runtime',
        type: 'frame',
      })
    );
  });

  it('supports once listeners', () => {
    const bus = createRuntimeEventBus();
    const listener = vi.fn();

    bus.once('lifecycle', listener);
    bus.emit({
      category: 'lifecycle',
      type: 'started',
      timestamp: 1,
      frame: 0,
      payload: undefined,
    });
    bus.emit({
      category: 'lifecycle',
      type: 'stopped',
      timestamp: 2,
      frame: 1,
      payload: undefined,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('service tokens and services', () => {
  it('registers and resolves services by token', () => {
    const engine = createEngine();
    const token = createServiceToken<{ name: string }>('test-service');

    engine.registerService(token, { name: 'core' });

    expect(engine.getService(token)).toEqual({ name: 'core' });
    expect(engine.context.getService(token)).toEqual({ name: 'core' });
    expect(engine.context.hasService(token)).toBe(true);
  });

  it('throws on missing service', () => {
    const engine = createEngine();
    const token = createServiceToken<{ name: string }>('missing');

    expect(() => engine.getService(token)).toThrow(/Service not found/);
  });
});

describe('engine frame orchestration', () => {
  it('runs update, fixedUpdate, lateUpdate and render in order', () => {
    const engine = createEngine({ fixedDeltaTime: 0.01 });
    const calls: string[] = [];

    const system = createSystem('test-system', {
      update(frame: FrameInfo, context: RuntimeContext) {
        calls.push(`update:${frame.frame}:${context.state}`);
      },
      fixedUpdate(frame: FrameInfo) {
        calls.push(`fixed:${frame.deltaTime.toFixed(2)}`);
      },
      lateUpdate() {
        calls.push('lateUpdate');
      },
      render() {
        calls.push('render');
      },
    });

    engine.registerSystem(system);
    engine.step(0);
    engine.step(20);

    expect(calls[0]).toBe('update:1:initialized');
    expect(calls).toContain('fixed:0.01');
    expect(calls.at(-2)).toBe('lateUpdate');
    expect(calls.at(-1)).toBe('render');
  });

  it('pauses and resumes time progression', () => {
    const engine = createEngine();

    engine.step(0);
    engine.pause();
    const pausedFrame = engine.step(16);
    const elapsedWhilePaused = engine.time.elapsedTime;

    engine.resume();
    const resumedFrame = engine.step(32);

    expect(pausedFrame.deltaTime).toBeGreaterThan(0);
    expect(elapsedWhilePaused).toBeGreaterThan(0);
    expect(resumedFrame.deltaTime).toBeGreaterThanOrEqual(0);
    expect(engine.time.paused).toBe(false);
  });

  it('mounts plain mount target objects without DOM requirements', () => {
    const engine = createEngine();
    const emitSpy = vi.fn();
    engine.context.eventBus.on('runtime', emitSpy);

    engine.mount({ canvas: undefined, element: undefined });

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'runtime',
        type: 'mounted',
      })
    );
  });

  it('prevents duplicate system ids', () => {
    const engine = createEngine();
    engine.registerSystem(createSystem('duplicate'));

    expect(() => engine.registerSystem(createSystem('duplicate'))).toThrow(
      /System already registered/
    );
  });
});
