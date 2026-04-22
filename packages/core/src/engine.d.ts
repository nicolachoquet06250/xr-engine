export type ServiceToken<T> = symbol & { readonly __type?: T };

export interface Disposable {
  dispose(): void;
}

export interface FrameInfo {
  readonly frame: number;
  readonly timestamp: number;
  readonly deltaTime: number;
  readonly fixedDeltaTime: number;
  readonly interpolationAlpha: number;
}

export interface Time {
  elapsedTime: number;
  deltaTime: number;
  fixedDeltaTime: number;
  frame: number;
  timeScale: number;
  paused: boolean;
}

export type LifecycleState =
  | 'created'
  | 'initialized'
  | 'mounted'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'disposed';

export interface RuntimeContext {
  readonly time: Time;
  readonly state: LifecycleState;
  readonly eventBus: RuntimeEventBus;
  getService<T>(token: ServiceToken<T>): T;
  hasService(token: ServiceToken<unknown>): boolean;
}

export interface EngineSystem extends Disposable {
  readonly id: string;
  initialize?(context: RuntimeContext): void | Promise<void>;
  update?(frame: FrameInfo, context: RuntimeContext): void;
  fixedUpdate?(frame: FrameInfo, context: RuntimeContext): void;
  lateUpdate?(frame: FrameInfo, context: RuntimeContext): void;
  render?(frame: FrameInfo, context: RuntimeContext): void;
}

export interface EnginePlugin {
  readonly id: string;
  install(engine: Engine): void;
}

export interface EngineConfig {
  readonly autoStart?: boolean;
  readonly fixedDeltaTime?: number;
  readonly maxSubSteps?: number;
  readonly timeScale?: number;
  readonly debug?: boolean;
}

export interface EngineMountTarget {
  readonly element?: Element;
  readonly canvas?: HTMLCanvasElement;
}

export type SystemPhase = 'input' | 'xr' | 'update' | 'fixedUpdate' | 'lateUpdate' | 'render';

export type RuntimeEventCategory =
  | 'runtime'
  | 'lifecycle'
  | 'input'
  | 'xr'
  | 'collision'
  | 'interaction'
  | 'ui';

export interface RuntimeEventBase<TType extends string = string, TPayload = unknown> {
  readonly category: RuntimeEventCategory;
  readonly type: TType;
  readonly timestamp: number;
  readonly frame: number;
  readonly payload: TPayload;
}

export interface RuntimeEventMap {
  runtime: RuntimeEventBase<string, unknown>;
  lifecycle: RuntimeEventBase<string, unknown>;
  input: RuntimeEventBase<string, unknown>;
  xr: RuntimeEventBase<string, unknown>;
  collision: RuntimeEventBase<string, unknown>;
  interaction: RuntimeEventBase<string, unknown>;
  ui: RuntimeEventBase<string, unknown>;
}

export interface RuntimeEventBus {
  emit<K extends keyof RuntimeEventMap>(event: RuntimeEventMap[K]): void;
  on<K extends keyof RuntimeEventMap>(
    category: K,
    listener: (event: RuntimeEventMap[K]) => void
  ): Disposable;
  once<K extends keyof RuntimeEventMap>(
    category: K,
    listener: (event: RuntimeEventMap[K]) => void
  ): Disposable;
  off<K extends keyof RuntimeEventMap>(
    category: K,
    listener: (event: RuntimeEventMap[K]) => void
  ): void;
  clear(category?: keyof RuntimeEventMap): void;
}

export interface SystemRegistration {
  readonly system: EngineSystem;
  readonly priority: number;
  readonly phases: readonly SystemPhase[];
}

export interface ServiceRegistration<T = unknown> {
  readonly token: ServiceToken<T>;
  readonly value: T;
}

export interface Engine {
  readonly state: LifecycleState;
  readonly context: RuntimeContext;
  readonly time: Time;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): void;
  resume(): void;
  mount(target: EngineMountTarget | Element | HTMLCanvasElement): void;
  unmount(): void;
  registerSystem(system: EngineSystem): void;
  unregisterSystem(systemId: string): void;
  registerService<T>(token: ServiceToken<T>, service: T): void;
  getService<T>(token: ServiceToken<T>): T;
  hasService(token: ServiceToken<unknown>): boolean;
  step(timestamp?: number): FrameInfo;
  use(plugin: EnginePlugin): void;
}

export interface RuntimeContextInternal extends RuntimeContext {
  readonly eventBus: RuntimeEventBus;
}

export declare function createEngine(config?: EngineConfig): Engine;
export declare function createRuntimeEventBus(): RuntimeEventBus;
export declare function createServiceToken<T>(description: string): ServiceToken<T>;

export type SystemPhase = 'input' | 'xr' | 'update' | 'fixedUpdate' | 'lateUpdate' | 'render';
export type RuntimeEventCategory =
  | 'runtime'
  | 'lifecycle'
  | 'input'
  | 'xr'
  | 'collision'
  | 'interaction'
  | 'ui';

export interface RuntimeEventBase<TType extends string = string, TPayload = unknown> {
  readonly category: RuntimeEventCategory;
  readonly type: TType;
  readonly timestamp: number;
  readonly frame: number;
  readonly payload: TPayload;
}

export interface RuntimeEventMap {
  runtime: RuntimeEventBase<string, unknown>;
  lifecycle: RuntimeEventBase<string, unknown>;
  input: RuntimeEventBase<string, unknown>;
  xr: RuntimeEventBase<string, unknown>;
  collision: RuntimeEventBase<string, unknown>;
  interaction: RuntimeEventBase<string, unknown>;
  ui: RuntimeEventBase<string, unknown>;
}

export interface RuntimeEventBus {
  emit<K extends keyof RuntimeEventMap>(event: RuntimeEventMap[K]): void;
  on<K extends keyof RuntimeEventMap>(
    category: K,
    listener: (event: RuntimeEventMap[K]) => void
  ): Disposable;
  once<K extends keyof RuntimeEventMap>(
    category: K,
    listener: (event: RuntimeEventMap[K]) => void
  ): Disposable;
  off<K extends keyof RuntimeEventMap>(
    category: K,
    listener: (event: RuntimeEventMap[K]) => void
  ): void;
  clear(category?: keyof RuntimeEventMap): void;
}

export interface SystemRegistration {
  readonly system: EngineSystem;
  readonly priority: number;
  readonly phases: readonly SystemPhase[];
}

export interface ServiceRegistration<T = unknown> {
  readonly token: ServiceToken<T>;
  readonly value: T;
}

export interface RuntimeContextInternal extends RuntimeContext {
  readonly eventBus: RuntimeEventBus;
}
