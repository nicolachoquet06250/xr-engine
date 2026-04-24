export interface DebugSnapshot {
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

export interface DevtoolsFrameSample {
  readonly timestamp: number;
  readonly frameTimeMs: number;
  readonly drawCalls: number;
}

export interface DevtoolsPerformanceMetrics {
  readonly fps: number;
  readonly frameTimeMs: number;
  readonly drawCalls: number;
  readonly samples: number;
}

export interface DevtoolsEntityNode {
  readonly id: string;
  readonly name?: string;
  readonly active?: boolean;
  readonly parentId?: string | null;
  readonly children?: readonly string[];
  readonly components?: readonly string[];
  readonly tags?: readonly string[];
}

export interface DevtoolsSceneStats {
  readonly entityCount: number;
  readonly activeEntityCount: number;
}

export interface DevtoolsRigidBodyState {
  readonly id: string;
  readonly entityId?: string | null;
  readonly type?: string;
  readonly kinematic?: boolean;
  readonly ccdEnabled?: boolean;
}

export interface DevtoolsPhysicsStats {
  readonly rigidBodyCount: number;
}

export interface DevtoolsInputSnapshot {
  readonly actions: Readonly<Record<string, unknown>>;
  readonly devices: readonly unknown[];
  readonly intents: readonly unknown[];
}

export interface DevtoolsXRState {
  readonly supported?: boolean;
  readonly active?: boolean;
  readonly mode?: string | null;
  readonly trackingMode?: string;
  readonly frameTimestamp?: number;
}

export interface DevtoolsHandState {
  readonly handedness: string;
  readonly trackingState?: string;
  readonly pinching?: boolean;
  readonly pinchStrength?: number;
  readonly poking?: boolean;
  readonly nearTargeting?: boolean;
  readonly jointCount?: number;
  readonly joints?: readonly unknown[];
}

export interface DevtoolsDataSource {
  readonly now?: () => number;
  readonly getDrawCalls?: () => number;
  readonly getSceneEntities?: () => readonly DevtoolsEntityNode[];
  readonly getPhysicsBodies?: () => readonly DevtoolsRigidBodyState[];
  readonly getInputSnapshot?: () => DevtoolsInputSnapshot;
  readonly getXRState?: () => DevtoolsXRState;
  readonly getHandStates?: () => readonly DevtoolsHandState[];
}

export interface EngineInspector {
  captureSnapshot(): DebugSnapshot;
}

export interface SceneInspector {
  listEntities(): readonly string[];
  getTree(): readonly DevtoolsEntityNode[];
  getStats(): DevtoolsSceneStats;
}

export interface PhysicsInspector {
  listBodies(): readonly string[];
  getBodies(): readonly DevtoolsRigidBodyState[];
  getStats(): DevtoolsPhysicsStats;
}

export interface InputInspector {
  getActionStates(): Readonly<Record<string, unknown>>;
  getSnapshot(): DevtoolsInputSnapshot;
}

export interface XRInspector {
  getTrackingState(): DevtoolsXRState;
}

export interface HandTrackingInspector {
  getJointStates(): readonly unknown[];
  getHandStates(): readonly DevtoolsHandState[];
}

export interface PerformancePanel {
  recordFrame(sample: Omit<DevtoolsFrameSample, 'frameTimeMs'>): DevtoolsFrameSample;
  getMetrics(): DevtoolsPerformanceMetrics;
  reset(): void;
}

export interface DevtoolsSuite {
  readonly engineInspector: EngineInspector;
  readonly sceneInspector: SceneInspector;
  readonly physicsInspector: PhysicsInspector;
  readonly inputInspector: InputInspector;
  readonly xrInspector: XRInspector;
  readonly handTrackingInspector: HandTrackingInspector;
  readonly performancePanel: PerformancePanel;
}

function freezeObject<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

function createEmptyInputSnapshot(): DevtoolsInputSnapshot {
  return freezeObject({ actions: freezeObject({}), devices: Object.freeze([]), intents: Object.freeze([]) });
}

class PerformancePanelImpl implements PerformancePanel {
  private readonly samples: DevtoolsFrameSample[] = [];

  public constructor(
    private readonly source: DevtoolsDataSource,
    private readonly maxSamples: number
  ) {}

  public recordFrame(sample: Omit<DevtoolsFrameSample, 'frameTimeMs'>): DevtoolsFrameSample {
    const previous = this.samples[this.samples.length - 1] ?? null;
    const frameTimeMs = previous ? Math.max(0, sample.timestamp - previous.timestamp) : 0;
    const next = freezeObject({ ...sample, frameTimeMs });
    this.samples.push(next);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    return next;
  }

  public getMetrics(): DevtoolsPerformanceMetrics {
    const sampleCount = this.samples.length;
    const latest = this.samples[sampleCount - 1] ?? null;

    let averageFrameTime = 0;
    let averageDrawCalls = 0;

    if (sampleCount > 0) {
      const totalFrameTime = this.samples.reduce((sum, item) => sum + item.frameTimeMs, 0);
      const totalDrawCalls = this.samples.reduce((sum, item) => sum + item.drawCalls, 0);
      averageFrameTime = totalFrameTime / sampleCount;
      averageDrawCalls = totalDrawCalls / sampleCount;
    }

    const fps = averageFrameTime > Number.EPSILON ? 1000 / averageFrameTime : 0;

    return freezeObject({
      fps,
      frameTimeMs: latest?.frameTimeMs ?? 0,
      drawCalls: Math.round(averageDrawCalls),
      samples: sampleCount,
    });
  }

  public reset(): void {
    this.samples.length = 0;
  }
}

class SceneInspectorImpl implements SceneInspector {
  public constructor(private readonly source: DevtoolsDataSource) {}

  public listEntities(): readonly string[] {
    return Object.freeze(this.getTree().map((entity) => entity.id));
  }

  public getTree(): readonly DevtoolsEntityNode[] {
    const entities = this.source.getSceneEntities?.() ?? [];
    return Object.freeze(
      entities.map((entity) =>
        freezeObject({
          ...entity,
          children: Object.freeze([...(entity.children ?? [])]),
          components: Object.freeze([...(entity.components ?? [])]),
          tags: Object.freeze([...(entity.tags ?? [])]),
        })
      )
    );
  }

  public getStats(): DevtoolsSceneStats {
    const entities = this.getTree();
    const activeEntityCount = entities.filter((entity) => entity.active !== false).length;
    return freezeObject({ entityCount: entities.length, activeEntityCount });
  }
}

class PhysicsInspectorImpl implements PhysicsInspector {
  public constructor(private readonly source: DevtoolsDataSource) {}

  public listBodies(): readonly string[] {
    return Object.freeze(this.getBodies().map((body) => body.id));
  }

  public getBodies(): readonly DevtoolsRigidBodyState[] {
    const bodies = this.source.getPhysicsBodies?.() ?? [];
    return Object.freeze(bodies.map((body) => freezeObject({ ...body })));
  }

  public getStats(): DevtoolsPhysicsStats {
    return freezeObject({ rigidBodyCount: this.getBodies().length });
  }
}

class InputInspectorImpl implements InputInspector {
  public constructor(private readonly source: DevtoolsDataSource) {}

  public getActionStates(): Readonly<Record<string, unknown>> {
    return this.getSnapshot().actions;
  }

  public getSnapshot(): DevtoolsInputSnapshot {
    const snapshot = this.source.getInputSnapshot?.() ?? createEmptyInputSnapshot();

    return freezeObject({
      actions: freezeObject({ ...snapshot.actions }),
      devices: Object.freeze([...(snapshot.devices ?? [])]),
      intents: Object.freeze([...(snapshot.intents ?? [])]),
    });
  }
}

class XRInspectorImpl implements XRInspector {
  public constructor(private readonly source: DevtoolsDataSource) {}

  public getTrackingState(): DevtoolsXRState {
    const state = this.source.getXRState?.() ?? {};
    return freezeObject({ ...state });
  }
}

class HandTrackingInspectorImpl implements HandTrackingInspector {
  public constructor(private readonly source: DevtoolsDataSource) {}

  public getJointStates(): readonly unknown[] {
    const hands = this.getHandStates();
    return Object.freeze(hands.flatMap((hand) => [...(hand.joints ?? [])]));
  }

  public getHandStates(): readonly DevtoolsHandState[] {
    const hands = this.source.getHandStates?.() ?? [];
    return Object.freeze(
      hands.map((hand) =>
        freezeObject({
          ...hand,
          joints: Object.freeze([...(hand.joints ?? [])]),
        })
      )
    );
  }
}

class EngineInspectorImpl implements EngineInspector {
  public constructor(
    private readonly source: DevtoolsDataSource,
    private readonly sceneInspector: SceneInspector,
    private readonly physicsInspector: PhysicsInspector,
    private readonly inputInspector: InputInspector,
    private readonly xrInspector: XRInspector,
    private readonly handTrackingInspector: HandTrackingInspector,
    private readonly performancePanel: PerformancePanel
  ) {}

  public captureSnapshot(): DebugSnapshot {
    const timestamp = this.source.now?.() ?? Date.now();
    const drawCalls = this.source.getDrawCalls?.() ?? 0;
    this.performancePanel.recordFrame({ timestamp, drawCalls });

    return freezeObject({
      timestamp,
      data: freezeObject({
        performance: this.performancePanel.getMetrics(),
        scene: this.sceneInspector.getStats(),
        physics: this.physicsInspector.getStats(),
        input: this.inputInspector.getSnapshot(),
        xr: this.xrInspector.getTrackingState(),
        hands: this.handTrackingInspector.getHandStates(),
      }),
    });
  }
}

export interface CreateDevtoolsSuiteOptions {
  readonly source?: DevtoolsDataSource;
  readonly maxFrameSamples?: number;
}

export function createDevtoolsSuite(options: CreateDevtoolsSuiteOptions = {}): DevtoolsSuite {
  const source = options.source ?? {};
  const maxFrameSamples = Math.max(1, options.maxFrameSamples ?? 120);

  const performancePanel = new PerformancePanelImpl(source, maxFrameSamples);
  const sceneInspector = new SceneInspectorImpl(source);
  const physicsInspector = new PhysicsInspectorImpl(source);
  const inputInspector = new InputInspectorImpl(source);
  const xrInspector = new XRInspectorImpl(source);
  const handTrackingInspector = new HandTrackingInspectorImpl(source);

  return freezeObject({
    engineInspector: new EngineInspectorImpl(
      source,
      sceneInspector,
      physicsInspector,
      inputInspector,
      xrInspector,
      handTrackingInspector,
      performancePanel
    ),
    sceneInspector,
    physicsInspector,
    inputInspector,
    xrInspector,
    handTrackingInspector,
    performancePanel,
  });
}
