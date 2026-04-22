import type {
  Disposable,
  Engine,
  EngineConfig,
  EngineMountTarget,
  EnginePlugin,
  EngineSystem,
  FrameInfo,
  LifecycleState,
  ServiceToken,
  Time,
  SystemPhase,
  RuntimeEventBus,
  RuntimeEventMap,
  RuntimeContextInternal,
  SystemRegistration,
  RuntimeEventCategory,
} from './engine.d';

const DEFAULT_FIXED_DELTA_TIME = 1 / 60;
const DEFAULT_MAX_SUB_STEPS = 5;
const DEFAULT_TIME_SCALE = 1;
const DEFAULT_PHASES: readonly SystemPhase[] = ['update', 'fixedUpdate', 'lateUpdate', 'render'];

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function createDisposable(fn: () => void): Disposable {
  let disposed = false;
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      fn();
    },
  };
}

function normalizeMountTarget(
  target: EngineMountTarget | Element | HTMLCanvasElement
): EngineMountTarget {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    if (typeof HTMLCanvasElement !== 'undefined' && target instanceof HTMLCanvasElement) {
      return { canvas: target, element: target };
    }
    return { element: target };
  }

  return target as EngineMountTarget;
}

function createTimeState(config?: EngineConfig): Time {
  return {
    elapsedTime: 0,
    deltaTime: 0,
    fixedDeltaTime: config?.fixedDeltaTime ?? DEFAULT_FIXED_DELTA_TIME,
    frame: 0,
    timeScale: config?.timeScale ?? DEFAULT_TIME_SCALE,
    paused: false,
  };
}

export function createServiceToken<T>(description: string): ServiceToken<T> {
  return Symbol(description) as ServiceToken<T>;
}

export function createRuntimeEventBus(): RuntimeEventBus {
  type Listener<K extends keyof RuntimeEventMap> = (event: RuntimeEventMap[K]) => void;
  const listeners: { [K in keyof RuntimeEventMap]: Set<Listener<K>> } = {
    runtime: new Set(),
    lifecycle: new Set(),
    input: new Set(),
    xr: new Set(),
    collision: new Set(),
    interaction: new Set(),
    ui: new Set(),
  };

  return {
    emit<E extends { category: keyof RuntimeEventMap }>(event: E) {
      const bucket = listeners[event.category] as unknown as Set<(event: E) => void>;
      for (const listener of bucket) listener(event);
    },
    on(category, listener) {
      const bucket = listeners[category] as Set<typeof listener>;
      bucket.add(listener);
      return createDisposable(() => {
        bucket.delete(listener);
      });
    },
    once(category, listener) {
      const disposable = this.on(category, (event: RuntimeEventMap[typeof category]) => {
        disposable?.dispose();
        listener(event);
      });
      return disposable;
    },
    off(category, listener) {
      const bucket = listeners[category] as Set<typeof listener>;
      bucket.delete(listener);
    },
    clear(category) {
      if (category) {
        listeners[category].clear();
        return;
      }
      (Object.keys(listeners) as Array<keyof RuntimeEventMap>).forEach((key) =>
        listeners[key].clear()
      );
    },
  };
}

class EngineImpl implements Engine {
  public state: LifecycleState = 'created';
  public readonly time: Time;
  public readonly context: RuntimeContextInternal;

  private readonly config: Required<
    Pick<EngineConfig, 'fixedDeltaTime' | 'maxSubSteps' | 'timeScale'>
  > &
    EngineConfig;
  private readonly eventBus: RuntimeEventBus;
  private readonly services = new Map<ServiceToken<unknown>, unknown>();
  private readonly systems = new Map<string, SystemRegistration>();
  private readonly plugins = new Set<string>();

  private mountTarget?: EngineMountTarget;
  private animationHandle: number | ReturnType<typeof setTimeout> | null = null;
  private previousTimestamp: number | null = null;
  private accumulator = 0;
  private initialized = false;

  constructor(config: EngineConfig = {}) {
    this.config = {
      ...config,
      fixedDeltaTime: config.fixedDeltaTime ?? DEFAULT_FIXED_DELTA_TIME,
      maxSubSteps: config.maxSubSteps ?? DEFAULT_MAX_SUB_STEPS,
      timeScale: config.timeScale ?? DEFAULT_TIME_SCALE,
    };

    this.time = createTimeState(this.config);
    this.eventBus = createRuntimeEventBus();

    const thisEngine = this;

    this.context = {
      get time() {
        return thisEngine.time;
      },
      get state() {
        return thisEngine.state;
      },
      get eventBus() {
        return thisEngine.eventBus;
      },
      getService: <T>(token: ServiceToken<T>): T => this.getService(token),
      hasService: (token: ServiceToken<unknown>): boolean => this.hasService(token),
    };
  }

  public async start(): Promise<void> {
    if (this.state === 'running') return;

    await this.initializeIfNeeded();
    this.state = 'running';
    this.time.paused = false;
    this.emit('lifecycle', 'started');
    this.scheduleNextFrame();
  }

  public async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'disposed') return;

    this.cancelScheduledFrame();
    this.state = 'stopped';
    this.previousTimestamp = null;
    this.accumulator = 0;
    this.emit('lifecycle', 'stopped');
  }

  public pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.time.paused = true;
    this.cancelScheduledFrame();
    this.emit('lifecycle', 'paused');
  }

  public resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.time.paused = false;
    this.previousTimestamp = null;
    this.emit('lifecycle', 'resumed');
    this.scheduleNextFrame();
  }

  public mount(target: EngineMountTarget | Element | HTMLCanvasElement): void {
    this.mountTarget = normalizeMountTarget(target);
    if (this.state === 'created') {
      this.state = 'mounted';
    }
    this.emit('runtime', 'mounted', { target: this.mountTarget });
  }

  public unmount(): void {
    this.mountTarget = undefined;
    if (this.state !== 'disposed' && this.state !== 'stopped') {
      this.state = 'initialized';
    }
    this.emit('runtime', 'unmounted');
  }

  public registerSystem(system: EngineSystem): void {
    this.assertUniqueSystemId(system.id);
    const registration: SystemRegistration = {
      system,
      priority: 0,
      phases: this.inferSystemPhases(system),
    };

    this.systems.set(system.id, registration);
  }

  public unregisterSystem(systemId: string): void {
    const registration = this.systems.get(systemId);
    if (!registration) return;
    registration.system.dispose();
    this.systems.delete(systemId);
  }

  public registerService<T>(token: ServiceToken<T>, service: T): void {
    this.services.set(token as ServiceToken<unknown>, service as unknown);
  }

  public hasService(token: ServiceToken<unknown>): boolean {
    return this.services.has(token);
  }

  public getService<T>(token: ServiceToken<T>): T {
    if (!this.services.has(token as ServiceToken<unknown>)) {
      throw new Error(
        `Service not found for token: ${String(token.description ?? token.toString())}`
      );
    }
    return this.services.get(token as ServiceToken<unknown>) as T;
  }

  public use(plugin: EnginePlugin): void {
    if (this.plugins.has(plugin.id)) return;
    plugin.install(this);
    this.plugins.add(plugin.id);
  }

  public step(timestamp = now()): FrameInfo {
    if (this.state === 'created') {
      this.state = 'initialized';
    }

    const rawDelta =
      this.previousTimestamp == null ? 0 : Math.max(0, (timestamp - this.previousTimestamp) / 1000);
    this.previousTimestamp = timestamp;

    const scaledDelta = this.time.paused ? 0 : rawDelta * this.time.timeScale;
    this.time.deltaTime = scaledDelta;
    this.time.elapsedTime += scaledDelta;
    this.time.frame += 1;

    const frameBase = {
      frame: this.time.frame,
      timestamp,
      deltaTime: this.time.deltaTime,
      fixedDeltaTime: this.time.fixedDeltaTime,
      interpolationAlpha: 0,
    } satisfies FrameInfo;

    this.runPhase('input', frameBase);
    this.runPhase('xr', frameBase);
    this.runPhase('update', frameBase);

    if (!this.time.paused) {
      this.accumulator += scaledDelta;
      let subSteps = 0;
      while (this.accumulator >= this.time.fixedDeltaTime && subSteps < this.config.maxSubSteps) {
        const fixedFrame: FrameInfo = {
          ...frameBase,
          deltaTime: this.time.fixedDeltaTime,
          fixedDeltaTime: this.time.fixedDeltaTime,
          interpolationAlpha: 0,
        };
        this.runPhase('fixedUpdate', fixedFrame);
        this.accumulator -= this.time.fixedDeltaTime;
        subSteps += 1;
      }
    }

    const interpolationAlpha =
      this.time.fixedDeltaTime > 0 ? this.accumulator / this.time.fixedDeltaTime : 0;
    const frame: FrameInfo = {
      ...frameBase,
      interpolationAlpha,
    };

    this.runPhase('lateUpdate', frame);
    this.runPhase('render', frame);
    this.emit('runtime', 'frame', frame);

    return frame;
  }

  private async initializeIfNeeded(): Promise<void> {
    if (this.initialized) return;
    this.state = 'initialized';
    for (const { system } of this.getSortedSystems()) {
      await system.initialize?.(this.context);
    }
    this.initialized = true;
    this.emit('lifecycle', 'initialized');
  }

  private scheduleNextFrame(): void {
    if (this.state !== 'running') return;

    const callback = (timestamp?: number) => {
      this.animationHandle = null;
      if (this.state !== 'running') return;
      this.step(timestamp ?? now());
      this.scheduleNextFrame();
    };

    if (typeof requestAnimationFrame === 'function') {
      this.animationHandle = requestAnimationFrame(callback);
      return;
    }

    this.animationHandle = setTimeout(() => callback(now()), 16);
  }

  private cancelScheduledFrame(): void {
    if (this.animationHandle == null) return;
    if (typeof cancelAnimationFrame === 'function' && typeof this.animationHandle === 'number') {
      cancelAnimationFrame(this.animationHandle);
    } else {
      clearTimeout(this.animationHandle as ReturnType<typeof setTimeout>);
    }
    this.animationHandle = null;
  }

  private getSortedSystems(): readonly SystemRegistration[] {
    return [...this.systems.values()].sort(
      (left, right) =>
        left.priority - right.priority || left.system.id.localeCompare(right.system.id)
    );
  }

  private runPhase(phase: SystemPhase, frame: FrameInfo): void {
    for (const { system, phases } of this.getSortedSystems()) {
      if (!phases.includes(phase)) continue;
      switch (phase) {
        case 'input':
          system.update?.(frame, this.context);
          break;
        case 'xr':
          system.update?.(frame, this.context);
          break;
        case 'update':
          system.update?.(frame, this.context);
          break;
        case 'fixedUpdate':
          system.fixedUpdate?.(frame, this.context);
          break;
        case 'lateUpdate':
          system.lateUpdate?.(frame, this.context);
          break;
        case 'render':
          system.render?.(frame, this.context);
          break;
      }
    }
  }

  private inferSystemPhases(system: EngineSystem): readonly SystemPhase[] {
    const phases = new Set<SystemPhase>();
    if (system.update) phases.add('update');
    if (system.fixedUpdate) phases.add('fixedUpdate');
    if (system.lateUpdate) phases.add('lateUpdate');
    if (system.render) phases.add('render');
    return phases.size > 0 ? [...phases] : DEFAULT_PHASES;
  }

  private assertUniqueSystemId(systemId: string): void {
    if (this.systems.has(systemId)) {
      throw new Error(`System already registered: ${systemId}`);
    }
  }

  private emit(category: RuntimeEventCategory, type: string, payload?: unknown): void {
    this.eventBus.emit({
      category,
      type,
      timestamp: now(),
      frame: this.time.frame,
      payload,
    });
  }
}

export function createEngine(config: EngineConfig = {}): Engine {
  return new EngineImpl(config);
}
