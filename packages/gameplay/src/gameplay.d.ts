import type { Entity } from '@xr-engine/scene';

export interface GameplayPublicApis {
  readonly engine?: unknown;
  readonly scene?: unknown;
  readonly physics?: unknown;
  readonly input?: unknown;
  readonly xr?: unknown;
  readonly interaction?: unknown;
  readonly assets?: unknown;
  readonly audio?: unknown;
}

export interface GameplayContext {
  readonly apis: GameplayPublicApis;
  readonly gameState: GameStateSnapshot;
}

export interface GameEvent {
  readonly type: string;
  readonly payload?: unknown;
}

export interface SpawnRequest {
  readonly prefab: string;
  readonly position?: unknown;
  readonly rotation?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface SpawnFactory {
  readonly prefab: string;
  spawn(request: SpawnRequest, context: GameplayContext): Promise<Entity>;
  despawn?(entity: Entity, context: GameplayContext): Promise<void>;
}

export interface SpawnService {
  registerPrefab(factory: SpawnFactory): void;
  hasPrefab(prefab: string): boolean;
  spawn(request: SpawnRequest): Promise<Entity>;
  despawn(entity: Entity): Promise<void>;
}

export interface GameState {
  readonly id: string;
  enter?(context: GameplayContext): void | Promise<void>;
  exit?(context: GameplayContext): void | Promise<void>;
  update?(deltaTime: number, context: GameplayContext): void;
}

export interface GameStateSnapshot {
  readonly current: string | null;
  readonly previous: string | null;
  readonly value: Readonly<Record<string, unknown>>;
}

export interface GameStateMachine {
  register(state: GameState): void;
  getCurrentStateId(): string | null;
  getSnapshot(): GameStateSnapshot;
  patchValue(partial: Readonly<Record<string, unknown>>): void;
  transitionTo(stateId: string): Promise<void>;
  update(deltaTime: number): void;
}

export interface SelectionCandidate {
  readonly entity: Entity;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface SelectionContext {
  readonly event?: GameEvent;
  readonly actor?: Entity;
}

export interface SelectionRule {
  readonly id: string;
  evaluate(candidate: SelectionCandidate, context: SelectionContext): SelectionDecision;
}

export interface SelectionDecision {
  readonly pass: boolean;
  readonly weight?: number;
}

export interface SelectionService {
  registerRule(rule: SelectionRule): void;
  select(
    candidates: readonly SelectionCandidate[],
    context?: SelectionContext
  ): SelectionCandidate | null;
}

export interface ScriptBehaviour {
  readonly id: string;
  onStart?(context: GameplayContext): void;
  onUpdate?(deltaTime: number, context: GameplayContext): void;
  onDestroy?(context: GameplayContext): void;
}

export interface ScriptRunner {
  add(behaviour: ScriptBehaviour): void;
  remove(id: string): void;
  has(id: string): boolean;
  startAll(): void;
  update(deltaTime: number): void;
  destroyAll(): void;
}

export interface GameplayInteraction {
  readonly id: string;
  matches(event: GameEvent, context: GameplayContext): boolean;
  execute(event: GameEvent, context: GameplayContext): void | Promise<void>;
}

export interface GameplayInteractionRegistry {
  register(interaction: GameplayInteraction): void;
  dispatch(event: GameEvent): Promise<number>;
}

export interface GameObjectBlueprint {
  readonly id: string;
  readonly prefab: string;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly behaviours?: readonly ScriptBehaviour[];
}

export interface GameObjectDefinition {
  readonly blueprintId: string;
  readonly spawn: SpawnRequest;
  readonly behaviours: readonly ScriptBehaviour[];
  readonly tags: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface GameplayComposer {
  register(blueprint: GameObjectBlueprint): void;
  compose(
    blueprintId: string,
    overrides?: Omit<Partial<GameObjectDefinition>, 'blueprintId' | 'spawn'> & {
      spawn?: Partial<SpawnRequest>;
    }
  ): GameObjectDefinition;
}

export interface GameplayServices {
  readonly spawn: SpawnService;
  readonly state: GameStateMachine;
  readonly selection: SelectionService;
  readonly scripts: ScriptRunner;
  readonly interactions: GameplayInteractionRegistry;
  readonly composer: GameplayComposer;
}

export interface CreateGameplayServicesOptions {
  readonly apis?: GameplayPublicApis;
  readonly initialGameValue?: Readonly<Record<string, unknown>>;
}
