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
  readonly elapsedTime: number;
  readonly deltaTime: number;
  readonly fixedDeltaTime: number;
  readonly frame: number;
  readonly timeScale: number;
  readonly paused: boolean;
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
  use(plugin: EnginePlugin): void;
}

export declare function createEngine(config?: EngineConfig): Engine;
export declare function createServiceToken<T>(description: string): ServiceToken<T>;
