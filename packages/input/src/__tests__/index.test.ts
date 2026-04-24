import { describe, expect, it } from 'vitest';
import { createInputSystem, inferSignalType } from '../index';
import type { InputDeviceAdapter, RawInputEvent } from '../input';

class StubAdapter implements InputDeviceAdapter {
  public readonly queue: RawInputEvent[] = [];

  public constructor(
    public readonly id: string,
    public readonly type: InputDeviceAdapter['type']
  ) {}

  public emit(event: Omit<RawInputEvent, 'deviceId'>): void {
    this.queue.push({ ...event, deviceId: this.id });
  }

  public poll(): readonly RawInputEvent[] {
    const snapshot = [...this.queue];
    this.queue.length = 0;
    return snapshot;
  }
}

describe('input package - unified input pipeline', () => {
  it('normalizes raw events from supported devices into signals', () => {
    const input = createInputSystem();
    const keyboard = new StubAdapter('kbd-1', 'keyboard');
    const hand = new StubAdapter('hand-left', 'xr-hand-left');

    input.registerAdapter(keyboard);
    input.registerAdapter(hand);

    keyboard.emit({ path: 'KeyW', value: true });
    hand.emit({ path: 'pinch/strength', value: 0.9 });
    hand.emit({
      path: 'ray/main',
      value: {
        origin: { x: 0, y: 1.5, z: 0 },
        direction: { x: 0, y: 0, z: -1 },
      },
    });

    input.update(123);

    const signals = input.getSignals();
    expect(signals).toHaveLength(3);
    expect(signals.map((signal) => signal.type)).toEqual(['button', 'pinch-state', 'ray']);
    expect(signals.every((signal) => signal.timestamp === 123)).toBe(true);

    expect(input.getDevices().map((device) => device.type)).toEqual(['keyboard', 'xr-hand-left']);
  });

  it('maps normalized signals to actions and derives intents', () => {
    const input = createInputSystem();
    const gamepad = new StubAdapter('gp-1', 'gamepad');

    input.registerAdapter(gamepad);
    input.rebind('jump', { device: 'gamepad', path: 'button/south' });
    input.rebind('move', { device: 'gamepad', path: 'left-stick' });

    gamepad.emit({ path: 'button/south', value: true });
    gamepad.emit({ path: 'left-stick', value: { x: 0.5, y: -0.25 } });

    input.update(10);

    const jump = input.getAction('jump');
    expect(jump?.state.pressed).toBe(true);
    expect(jump?.state.held).toBe(true);

    const moveIntent = input.getIntents().find((intent) => intent.name === 'move');
    expect(moveIntent?.active).toBe(true);
    expect(moveIntent?.value).toEqual({ x: 0.5, y: -0.25 });

    gamepad.emit({ path: 'button/south', value: false });
    input.update(11);

    expect(input.getAction('jump')?.state.released).toBe(true);
  });

  it('loads and exports an action profile', () => {
    const input = createInputSystem();

    input.loadProfile({
      id: 'default',
      bindings: {
        teleport: [{ device: 'xr-controller-right', path: 'thumbstick/click' }],
      },
    });

    const profile = input.exportProfile();
    expect(profile.bindings.teleport).toEqual([
      {
        device: 'xr-controller-right',
        path: 'thumbstick/click',
      },
    ]);
  });
});

describe('inferSignalType', () => {
  it('infers normalized signal categories', () => {
    expect(inferSignalType('grip/grab', 1)).toBe('grab-state');
    expect(inferSignalType('finger/poke', true)).toBe('poke-state');
    expect(inferSignalType('hand/pinch', true)).toBe('pinch-state');
    expect(inferSignalType('head/pose', { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } })).toBe('pose');
    expect(inferSignalType('pointer/ray', { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } })).toBe('ray');
    expect(inferSignalType('tracking/valid', true)).toBe('tracking-validity');
    expect(inferSignalType('left-stick', { x: 0, y: 0 })).toBe('axis');
  });
});
