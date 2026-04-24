import type { Ray, Vec3 } from '@xr-engine/math';
import type { Entity } from '@xr-engine/scene';

export type InteractionMode = 'far' | 'near' | 'grab' | 'ui' | 'teleport' | 'locomotion';
export type InteractorKind = 'controller' | 'hand' | 'unknown';

export interface InteractionResolution {
  readonly entity: Entity;
  readonly point?: Vec3;
  readonly normal?: Vec3;
  readonly distance?: number;
}

export interface InteractionEvent {
  readonly type:
    | 'hover-enter'
    | 'hover-exit'
    | 'select-start'
    | 'select-end'
    | 'grab-start'
    | 'grab-end';
  readonly interactor: Interactor;
  readonly previous: InteractionResolution | null;
  readonly target: InteractionResolution | null;
  readonly timestamp: number;
}

export interface Interactable {
  readonly entity: Entity;
  onHoverEnter?(event: InteractionEvent): void;
  onHoverExit?(event: InteractionEvent): void;
  onSelectStart?(event: InteractionEvent): void;
  onSelectEnd?(event: InteractionEvent): void;
  onGrabStart?(event: InteractionEvent): void;
  onGrabEnd?(event: InteractionEvent): void;
}

export interface Interactor {
  readonly id: string;
  readonly enabled: boolean;
  readonly mode: InteractionMode;
  readonly kind: InteractorKind;
  readonly ray: Ray;
  readonly position: Vec3;
  readonly nearRadius: number;
  readonly uiRadius: number;
  readonly locomotionRequested: boolean;
  readonly selectPressed: boolean;
  readonly grabPressed: boolean;
  readonly usePressed: boolean;
  readonly uiPressed: boolean;
}

export interface ControllerInteractionInput {
  readonly trackingValid: boolean;
  readonly position: Vec3;
  readonly ray?: Ray;
  readonly triggerPressed: boolean | number;
  readonly gripPressed: boolean | number;
  readonly thumbstickPressed?: boolean | number;
}

export interface HandInteractionInput {
  readonly trackingValid: boolean;
  readonly indexTip: Vec3;
  readonly ray?: Ray;
  readonly pinchStrength: number;
  readonly pinching: boolean;
  readonly poking: boolean;
  readonly nearTargeting: boolean;
}

export type InteractionIntentName = 'select' | 'grab' | 'release' | 'use' | 'teleport' | 'uiPress';

export interface InteractionIntentState {
  readonly name: InteractionIntentName;
  readonly active: boolean;
}

export interface ResolvedInteraction {
  readonly interactorId: string;
  readonly interactorKind: InteractorKind;
  readonly hover: InteractionResolution | null;
  readonly grabbed: InteractionResolution | null;
  readonly actions: {
    readonly use: boolean;
    readonly teleport: boolean;
    readonly uiPress: boolean;
  };
}

export interface InteractionSystemOptions {
  readonly resolve?: (
    interactor: Interactor,
    interactables: ReadonlyMap<string, Interactable>
  ) => InteractionResolution | null;
}

export interface InteractionSystem {
  registerInteractable(interactable: Interactable): void;
  unregisterInteractable(entityId: string): void;
  registerInteractor(interactor: Interactor): void;
  unregisterInteractor(interactorId: string): void;
  update(intents: readonly InteractionIntentState[]): readonly ResolvedInteraction[];
  getResolvedInteractions(): readonly ResolvedInteraction[];
}

export declare function createInteractionSystem(
  options?: InteractionSystemOptions
): InteractionSystem;
export declare function createControllerInteractor(
  id: string,
  input: ControllerInteractionInput
): Interactor;
export declare function createHandInteractor(id: string, input: HandInteractionInput): Interactor;
export declare function deriveInteractionIntents(
  interactor: Interactor
): readonly InteractionIntentState[];
export declare function resolveByDistance(
  interactor: Pick<Interactor, 'mode' | 'position' | 'nearRadius' | 'uiRadius'>,
  candidates: readonly InteractionResolution[]
): InteractionResolution | null;
