import type { Entity } from '@xr-engine/scene';

export interface GameplayContext {
    readonly engine: unknown;
    readonly scene: unknown;
}

export interface GameEvent {
    readonly type: string;
    readonly payload?: unknown;
}

export interface GameRule {
    readonly id: string;
}

export interface GameMode {
    readonly id: string;
}

export interface GameState {
    readonly id: string;
    enter(context: GameplayContext): void | Promise<void>;
    exit(context: GameplayContext): void | Promise<void>;
}

export interface SpawnRequest {
    readonly prefab: string;
    readonly position?: unknown;
    readonly rotation?: unknown;
}

export interface SpawnService {
    spawn(prefab: string, options?: SpawnRequest): Promise<Entity>;
    despawn(entity: Entity): Promise<void>;
}

export interface InteractionRule {
    readonly id: string;
}

export interface ScriptBehaviour {
    onStart?(context: GameplayContext): void;
    onUpdate?(deltaTime: number, context: GameplayContext): void;
    onDestroy?(context: GameplayContext): void;
}

export interface GameplaySystem {
    initialize(context: GameplayContext): void | Promise<void>;
    update(deltaTime: number, context: GameplayContext): void;
}
