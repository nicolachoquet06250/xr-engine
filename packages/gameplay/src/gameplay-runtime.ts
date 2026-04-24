import type { Entity } from '@xr-engine/scene';
import type {
  CreateGameplayServicesOptions,
  GameEvent,
  GameObjectBlueprint,
  GameObjectDefinition,
  GameState,
  GameStateMachine,
  GameStateSnapshot,
  GameplayComposer,
  GameplayContext,
  GameplayInteraction,
  GameplayInteractionRegistry,
  GameplayPublicApis,
  GameplayServices,
  ScriptBehaviour,
  ScriptRunner,
  SelectionCandidate,
  SelectionContext,
  SelectionRule,
  SpawnFactory,
  SpawnRequest,
  SpawnService,
} from './gameplay';

class GameplayContextStore {
  private current: GameStateSnapshot;

  public constructor(
    private readonly apis: GameplayPublicApis,
    initialValue: Readonly<Record<string, unknown>>
  ) {
    this.current = Object.freeze({
      current: null,
      previous: null,
      value: Object.freeze({ ...initialValue }),
    });
  }

  public createContext(): GameplayContext {
    return Object.freeze({
      apis: this.apis,
      gameState: this.current,
    });
  }

  public snapshot(): GameStateSnapshot {
    return this.current;
  }

  public patchValue(partial: Readonly<Record<string, unknown>>): void {
    this.current = Object.freeze({
      ...this.current,
      value: Object.freeze({ ...this.current.value, ...partial }),
    });
  }

  public setActiveState(current: string | null): void {
    this.current = Object.freeze({
      ...this.current,
      previous: this.current.current,
      current,
    });
  }
}

class SpawnServiceImpl implements SpawnService {
  private readonly factories = new Map<string, SpawnFactory>();
  private readonly spawned = new Map<string, string>();

  public constructor(private readonly contextStore: GameplayContextStore) {}

  public registerPrefab(factory: SpawnFactory): void {
    this.factories.set(factory.prefab, factory);
  }

  public hasPrefab(prefab: string): boolean {
    return this.factories.has(prefab);
  }

  public async spawn(request: SpawnRequest): Promise<Entity> {
    const factory = this.factories.get(request.prefab);
    if (!factory) {
      throw new Error(`No spawn factory registered for prefab "${request.prefab}".`);
    }

    const entity = await factory.spawn(request, this.contextStore.createContext());
    this.spawned.set(entity.id, request.prefab);
    return entity;
  }

  public async despawn(entity: Entity): Promise<void> {
    const prefab = this.spawned.get(entity.id);
    if (!prefab) {
      return;
    }

    const factory = this.factories.get(prefab);
    this.spawned.delete(entity.id);
    if (factory?.despawn) {
      await factory.despawn(entity, this.contextStore.createContext());
    }
  }
}

class GameStateMachineImpl implements GameStateMachine {
  private readonly states = new Map<string, GameState>();
  private active: GameState | null = null;

  public constructor(private readonly contextStore: GameplayContextStore) {}

  public register(state: GameState): void {
    this.states.set(state.id, state);
  }

  public getCurrentStateId(): string | null {
    return this.active?.id ?? null;
  }

  public getSnapshot(): GameStateSnapshot {
    return this.contextStore.snapshot();
  }

  public patchValue(partial: Readonly<Record<string, unknown>>): void {
    this.contextStore.patchValue(partial);
  }

  public async transitionTo(stateId: string): Promise<void> {
    const next = this.states.get(stateId);
    if (!next) {
      throw new Error(`Unknown game state "${stateId}".`);
    }

    const context = this.contextStore.createContext();
    if (this.active?.exit) {
      await this.active.exit(context);
    }

    this.active = next;
    this.contextStore.setActiveState(next.id);

    if (next.enter) {
      await next.enter(this.contextStore.createContext());
    }
  }

  public update(deltaTime: number): void {
    if (!this.active?.update) {
      return;
    }

    this.active.update(deltaTime, this.contextStore.createContext());
  }
}

class SelectionServiceImpl {
  private readonly rules: SelectionRule[] = [];

  public registerRule(rule: SelectionRule): void {
    this.rules.push(rule);
  }

  public select(
    candidates: readonly SelectionCandidate[],
    context: SelectionContext = {}
  ): SelectionCandidate | null {
    let selected: SelectionCandidate | null = null;
    let bestWeight = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      let totalWeight = 0;
      let pass = true;

      for (const rule of this.rules) {
        const decision = rule.evaluate(candidate, context);
        if (!decision.pass) {
          pass = false;
          break;
        }

        totalWeight += decision.weight ?? 0;
      }

      if (pass && totalWeight > bestWeight) {
        bestWeight = totalWeight;
        selected = candidate;
      }
    }

    return selected;
  }
}

class ScriptRunnerImpl implements ScriptRunner {
  private readonly behaviours = new Map<string, ScriptBehaviour>();
  private started = false;

  public constructor(private readonly contextStore: GameplayContextStore) {}

  public add(behaviour: ScriptBehaviour): void {
    this.behaviours.set(behaviour.id, behaviour);

    if (this.started && behaviour.onStart) {
      behaviour.onStart(this.contextStore.createContext());
    }
  }

  public remove(id: string): void {
    const behaviour = this.behaviours.get(id);
    if (!behaviour) {
      return;
    }

    if (this.started && behaviour.onDestroy) {
      behaviour.onDestroy(this.contextStore.createContext());
    }

    this.behaviours.delete(id);
  }

  public has(id: string): boolean {
    return this.behaviours.has(id);
  }

  public startAll(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    const context = this.contextStore.createContext();
    for (const behaviour of this.behaviours.values()) {
      behaviour.onStart?.(context);
    }
  }

  public update(deltaTime: number): void {
    if (!this.started) {
      return;
    }

    const context = this.contextStore.createContext();
    for (const behaviour of this.behaviours.values()) {
      behaviour.onUpdate?.(deltaTime, context);
    }
  }

  public destroyAll(): void {
    if (!this.started) {
      this.behaviours.clear();
      return;
    }

    const context = this.contextStore.createContext();
    for (const behaviour of this.behaviours.values()) {
      behaviour.onDestroy?.(context);
    }

    this.behaviours.clear();
    this.started = false;
  }
}

class GameplayInteractionRegistryImpl implements GameplayInteractionRegistry {
  private readonly interactions: GameplayInteraction[] = [];

  public constructor(private readonly contextStore: GameplayContextStore) {}

  public register(interaction: GameplayInteraction): void {
    this.interactions.push(interaction);
  }

  public async dispatch(event: GameEvent): Promise<number> {
    let executed = 0;
    const context = this.contextStore.createContext();

    for (const interaction of this.interactions) {
      if (!interaction.matches(event, context)) {
        continue;
      }

      await interaction.execute(event, context);
      executed += 1;
    }

    return executed;
  }
}

class GameplayComposerImpl implements GameplayComposer {
  private readonly blueprints = new Map<string, GameObjectBlueprint>();

  public register(blueprint: GameObjectBlueprint): void {
    this.blueprints.set(blueprint.id, blueprint);
  }

  public compose(
    blueprintId: string,
    overrides: Omit<Partial<GameObjectDefinition>, 'blueprintId' | 'spawn'> & {
      spawn?: Partial<SpawnRequest>;
    } = {}
  ): GameObjectDefinition {
    const blueprint = this.blueprints.get(blueprintId);
    if (!blueprint) {
      throw new Error(`Unknown gameplay blueprint "${blueprintId}".`);
    }

    const tags = Object.freeze([...(blueprint.tags ?? []), ...(overrides.tags ?? [])]);
    const behaviours = Object.freeze([...(blueprint.behaviours ?? []), ...(overrides.behaviours ?? [])]);
    const metadata = Object.freeze({ ...(blueprint.metadata ?? {}), ...(overrides.metadata ?? {}) });

    return Object.freeze({
      blueprintId,
      spawn: Object.freeze({
        prefab: blueprint.prefab,
        metadata,
        ...overrides.spawn,
      }),
      tags,
      metadata,
      behaviours,
    });
  }
}

export function createGameplayServices(options: CreateGameplayServicesOptions = {}): GameplayServices {
  const contextStore = new GameplayContextStore(options.apis ?? {}, options.initialGameValue ?? {});

  return Object.freeze({
    spawn: new SpawnServiceImpl(contextStore),
    state: new GameStateMachineImpl(contextStore),
    selection: new SelectionServiceImpl(),
    scripts: new ScriptRunnerImpl(contextStore),
    interactions: new GameplayInteractionRegistryImpl(contextStore),
    composer: new GameplayComposerImpl(),
  });
}
