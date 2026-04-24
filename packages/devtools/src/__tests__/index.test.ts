import { describe, expect, it } from 'vitest';

import { createDevtoolsSuite, type DevtoolsDataSource } from '../index';

describe('devtools suite', () => {
  it('collecte les métriques minimales et snapshots inspecteurs', () => {
    let now = 1000;
    const source: DevtoolsDataSource = {
      now: () => now,
      getDrawCalls: () => 42,
      getSceneEntities: () => [
        {
          id: 'entity-camera',
          name: 'Camera',
          active: true,
          parentId: null,
          children: ['entity-ui'],
          components: ['transform', 'camera'],
          tags: ['main-camera'],
        },
        {
          id: 'entity-ui',
          name: 'UI',
          active: false,
          parentId: 'entity-camera',
          children: [],
          components: ['transform'],
        },
      ],
      getPhysicsBodies: () => [
        { id: 'rb-player', entityId: 'entity-camera', type: 'dynamic' },
        { id: 'rb-platform', entityId: 'entity-ui', type: 'static' },
      ],
      getInputSnapshot: () => ({
        actions: {
          jump: { value: true, pressed: true, released: false, held: false },
        },
        devices: [{ id: 'keyboard-1', type: 'keyboard', connected: true }],
        intents: [{ name: 'jump', active: true }],
      }),
      getXRState: () => ({
        supported: true,
        active: true,
        mode: 'immersive-vr',
        trackingMode: 'hands-only',
      }),
      getHandStates: () => [
        {
          handedness: 'left',
          trackingState: 'tracked',
          pinching: true,
          pinchStrength: 0.8,
          poking: false,
          nearTargeting: true,
          jointCount: 2,
          joints: [{ joint: 'thumb-tip' }, { joint: 'index-finger-tip' }],
        },
      ],
    };

    const suite = createDevtoolsSuite({ source, maxFrameSamples: 8 });

    now = 1016;
    const first = suite.engineInspector.captureSnapshot();
    now = 1032;
    const second = suite.engineInspector.captureSnapshot();

    const metrics = suite.performancePanel.getMetrics();
    expect(first.timestamp).toBe(1016);
    expect(second.timestamp).toBe(1032);
    expect(metrics.drawCalls).toBe(42);
    expect(metrics.samples).toBe(2);
    expect(metrics.frameTimeMs).toBe(16);
    expect(metrics.fps).toBeCloseTo(125, 4);

    expect(suite.sceneInspector.getStats()).toEqual({ entityCount: 2, activeEntityCount: 1 });
    expect(suite.physicsInspector.getStats()).toEqual({ rigidBodyCount: 2 });
    expect(suite.sceneInspector.listEntities()).toEqual(['entity-camera', 'entity-ui']);
    expect(suite.physicsInspector.listBodies()).toEqual(['rb-player', 'rb-platform']);

    const xrState = suite.xrInspector.getTrackingState();
    expect(xrState.mode).toBe('immersive-vr');
    expect(xrState.trackingMode).toBe('hands-only');

    const handStates = suite.handTrackingInspector.getHandStates();
    expect(handStates).toHaveLength(1);
    expect(suite.handTrackingInspector.getJointStates()).toHaveLength(2);

    const inputSnapshot = suite.inputInspector.getSnapshot();
    expect(inputSnapshot.actions.jump).toEqual({
      value: true,
      pressed: true,
      released: false,
      held: false,
    });

    expect(second.data.scene).toEqual({ entityCount: 2, activeEntityCount: 1 });
    expect(second.data.physics).toEqual({ rigidBodyCount: 2 });
  });

  it('respecte la fenêtre glissante de profiling', () => {
    let now = 2000;
    const suite = createDevtoolsSuite({
      source: {
        now: () => now,
        getDrawCalls: () => 10,
      },
      maxFrameSamples: 2,
    });

    suite.engineInspector.captureSnapshot();
    now += 10;
    suite.engineInspector.captureSnapshot();
    now += 10;
    suite.engineInspector.captureSnapshot();

    const metrics = suite.performancePanel.getMetrics();
    expect(metrics.samples).toBe(2);
    expect(metrics.frameTimeMs).toBe(10);
    expect(metrics.drawCalls).toBe(10);
    expect(metrics.fps).toBeCloseTo(100, 4);

    suite.performancePanel.reset();
    expect(suite.performancePanel.getMetrics()).toEqual({
      fps: 0,
      frameTimeMs: 0,
      drawCalls: 0,
      samples: 0,
    });
  });
});
