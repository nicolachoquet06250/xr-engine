import { describe, expect, it } from 'vitest';

import { createXRManager } from '../index';
import type { XRConfig, XRRuntimeFrame, XRRuntimeProvider, XRRuntimeSession } from '../xr';

class StubSession implements XRRuntimeSession {
  public readonly referenceSpaceRequests: string[] = [];
  private readonly callbacks = new Map<number, (frame: XRRuntimeFrame) => void>();
  private handleSequence = 0;
  public ended = false;

  public async requestReferenceSpace(type: string): Promise<unknown> {
    this.referenceSpaceRequests.push(type);
    return { type };
  }

  public startFrameLoop(callback: (frame: XRRuntimeFrame) => void): number {
    this.handleSequence += 1;
    this.callbacks.set(this.handleSequence, callback);
    return this.handleSequence;
  }

  public stopFrameLoop(handle: number): void {
    this.callbacks.delete(handle);
  }

  public emit(frame: XRRuntimeFrame): void {
    for (const callback of this.callbacks.values()) {
      callback(frame);
    }
  }

  public async end(): Promise<void> {
    this.ended = true;
    this.callbacks.clear();
  }
}

class StubProvider implements XRRuntimeProvider {
  public readonly session = new StubSession();

  public readonly capabilities = {
    supported: true,
    immersiveVR: true,
    controllers: true,
    handTracking: true,
    handJoints: true,
    haptics: true,
  } as const;

  public async isSessionSupported(mode: 'inline' | 'immersive-vr'): Promise<boolean> {
    return mode === 'immersive-vr';
  }

  public async requestSession(
    _mode: 'inline' | 'immersive-vr',
    _config: XRConfig
  ): Promise<XRRuntimeSession> {
    return this.session;
  }
}

describe('xr package - session and tracking lifecycle', () => {
  it('handles support checks, session enter/exit, reference spaces and XR frame loop', async () => {
    const provider = new StubProvider();
    const manager = createXRManager(provider);

    await expect(manager.isSupported('inline')).resolves.toBe(false);
    await expect(manager.isSupported('immersive-vr')).resolves.toBe(true);

    await manager.enterSession('immersive-vr', {
      referenceSpaceTypes: ['viewer', 'local-floor'],
    });

    expect(manager.getSessionState().active).toBe(true);
    expect(manager.getSessionState().frameLoopActive).toBe(true);
    expect(manager.getReferenceSpace('viewer')?.type).toBe('viewer');
    expect(manager.getReferenceSpace('local-floor')?.type).toBe('local-floor');

    provider.session.emit({
      timestamp: 42,
      head: {
        trackingState: 'tracked',
        position: { x: 0, y: 1.6, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });

    expect(manager.getFrameState()).toEqual({ timestamp: 42, trackingLost: false });
    expect(manager.getHeadState()?.trackingState).toBe('tracked');

    await manager.exitSession();

    expect(provider.session.ended).toBe(true);
    expect(manager.getSessionState().active).toBe(false);
    expect(manager.getSessionState().frameLoopActive).toBe(false);
  });

  it('updates tracking state and mode transitions for controllers, hands, mixed and temporary loss', () => {
    const manager = createXRManager(new StubProvider());

    manager.updateTracking({
      timestamp: 1,
      head: {
        trackingState: 'tracked',
        position: { x: 0, y: 1.7, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
      controllers: {
        left: {
          trackingState: 'tracked',
          position: { x: -0.2, y: 1.4, z: -0.3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          buttons: { trigger: 1 },
          axes: [0.1, -0.2],
        },
      },
    });

    expect(manager.getSessionState().trackingMode).toBe('controllers-only');
    expect(manager.getControllerState('left')?.buttons.trigger).toBe(1);

    manager.updateTracking({
      timestamp: 2,
      head: {
        trackingState: 'tracked',
        position: { x: 0, y: 1.7, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
      hands: {
        left: {
          pose: {
            trackingState: 'tracked',
            position: { x: -0.15, y: 1.35, z: -0.2 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
          },
          joints: [
            {
              joint: 'wrist',
              trackingState: 'tracked',
              position: { x: -0.15, y: 1.3, z: -0.2 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
            {
              joint: 'thumb-tip',
              trackingState: 'tracked',
              position: { x: -0.12, y: 1.36, z: -0.22 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
            {
              joint: 'index-finger-tip',
              trackingState: 'tracked',
              position: { x: -0.11, y: 1.36, z: -0.22 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
          ],
        },
      },
    });

    expect(manager.getSessionState().trackingMode).toBe('hands-only');

    manager.updateTracking({
      timestamp: 3,
      head: {
        trackingState: 'tracked',
        position: { x: 0, y: 1.7, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
      controllers: {
        right: {
          trackingState: 'tracked',
          position: { x: 0.2, y: 1.4, z: -0.3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          buttons: { trigger: 0.8 },
          axes: [0.2, 0.1],
        },
      },
      hands: {
        left: {
          pose: {
            trackingState: 'tracked',
            position: { x: -0.15, y: 1.35, z: -0.2 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
          },
          joints: [
            {
              joint: 'wrist',
              trackingState: 'tracked',
              position: { x: -0.15, y: 1.3, z: -0.2 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
            {
              joint: 'index-finger-tip',
              trackingState: 'tracked',
              position: { x: -0.1, y: 1.42, z: -0.23 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
          ],
        },
      },
    });

    expect(manager.getSessionState().trackingMode).toBe('mixed');

    manager.updateTracking({
      timestamp: 4,
      head: {
        trackingState: 'not-tracked',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });

    expect(manager.getSessionState().trackingMode).toBe('none');
    expect(manager.getFrameState().trackingLost).toBe(true);
    expect(manager.getSessionState().modeChangeCount).toBe(4);
  });

  it('infers hand tracking runtime signals: joints, pinch, poke, palm orientation, near targeting and ray fallback', () => {
    const manager = createXRManager(new StubProvider());

    manager.updateTracking({
      timestamp: 10,
      head: {
        trackingState: 'tracked',
        position: { x: 0, y: 1.7, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
      hands: {
        right: {
          pose: {
            trackingState: 'tracked',
            position: { x: 0.15, y: 1.35, z: -0.2 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
          },
          joints: [
            {
              joint: 'wrist',
              trackingState: 'tracked',
              position: { x: 0.15, y: 1.28, z: -0.23 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
            {
              joint: 'middle-finger-metacarpal',
              trackingState: 'tracked',
              position: { x: 0.15, y: 1.33, z: -0.28 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
            {
              joint: 'thumb-tip',
              trackingState: 'tracked',
              position: { x: 0.17, y: 1.36, z: -0.21 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
            {
              joint: 'index-finger-tip',
              trackingState: 'tracked',
              position: { x: 0.171, y: 1.37, z: -0.211 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
            },
          ],
        },
      },
    });

    const hand = manager.getHandState('right');
    expect(hand).not.toBeNull();
    expect(hand?.joints.length).toBe(4);
    expect(hand?.pinching).toBe(true);
    expect(hand?.pinchStrength).toBeGreaterThan(0);
    expect(hand?.poking).toBe(true);
    expect(hand?.nearTargeting).toBe(true);
    expect(hand?.ray.origin).toEqual({ x: 0.171, y: 1.37, z: -0.211 });
    expect(hand?.ray.direction.z).toBeLessThan(0.5);
    expect(hand?.palmOrientation).toEqual({
      x: 0,
      y: 0.7071067811865478,
      z: -0.7071067811865474,
      w: 0,
    });
  });
});
