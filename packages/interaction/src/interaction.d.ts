import type { Ray, Vec3 } from '@xr-engine/math';
import type { Entity } from '@xr-engine/scene';

export type InteractionMode = 'far' | 'near' | 'grab' | 'ui' | 'teleport';

export interface InteractionTarget {
  readonly entity: Entity | null;
  readonly point?: Vec3;
  readonly normal?: Vec3;
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
  readonly target: InteractionTarget;
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
  readonly mode: InteractionMode;
  readonly enabled: boolean;
  update(): void;
  enable(): void;
  disable(): void;
}

export interface RayInteractor extends Interactor {
  readonly ray: Ray;
}

export interface GrabInteractor extends Interactor {
  readonly attachPoint?: Vec3;
}

export interface PinchInteractor extends Interactor {
  readonly pinchStrength: number;
}

export interface PokeInteractor extends Interactor {
  readonly tipPosition: Vec3;
}

export interface TeleportInteractor extends Interactor {
  readonly destination?: Vec3;
}

export interface UIInteractor extends Interactor {
  readonly focusedElementId?: string;
}
