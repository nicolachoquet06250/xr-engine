import type {
  ControllerInteractionInput,
  HandInteractionInput,
  Interactable,
  InteractionEvent,
  InteractionIntentState,
  InteractionResolution,
  InteractionSystem,
  InteractionSystemOptions,
  Interactor,
  InteractorKind,
  ResolvedInteraction,
} from './interaction';

import type { Vec3 } from '@xr-engine/math';

const DEFAULT_NEAR_DISTANCE = 0.2;
const DEFAULT_GRAB_DISTANCE = 0.12;
const DEFAULT_UI_DISTANCE = 0.03;
const BUTTON_THRESHOLD = 0.5;

const DEFAULT_RAY = Object.freeze({
  origin: Object.freeze({ x: 0, y: 0, z: 0 }),
  direction: Object.freeze({ x: 0, y: 0, z: -1 }),
});

function cloneVec3(value: Vec3): Vec3 {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

function toBoolean(value: number | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value >= BUTTON_THRESHOLD;
  return false;
}

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function freezeResolution(resolution: InteractionResolution | null): InteractionResolution | null {
  if (!resolution) return null;

  return Object.freeze({
    ...resolution,
    point: resolution.point ? cloneVec3(resolution.point) : undefined,
    normal: resolution.normal ? cloneVec3(resolution.normal) : undefined,
    distance: resolution.distance,
  });
}

function createEvent(
  type: InteractionEvent['type'],
  interactor: Interactor,
  previous: InteractionResolution | null,
  next: InteractionResolution | null
): InteractionEvent {
  return Object.freeze({
    type,
    interactor,
    previous,
    target: next,
    timestamp: Date.now(),
  });
}

function inferKind(interactor: Interactor): InteractorKind {
  if (interactor.id.includes('hand')) return 'hand';
  if (interactor.id.includes('controller')) return 'controller';
  return 'unknown';
}

class InteractionSystemImpl implements InteractionSystem {
  private readonly interactables = new Map<string, Interactable>();
  private readonly interactors = new Map<string, Interactor>();
  private readonly activeTargets = new Map<string, InteractionResolution | null>();
  private readonly activeGrabs = new Map<string, InteractionResolution | null>();
  private readonly lastResolved: ResolvedInteraction[] = [];

  public constructor(private readonly options: Required<InteractionSystemOptions>) {}

  public registerInteractable(interactable: Interactable): void {
    this.interactables.set(interactable.entity.id, interactable);
  }

  public unregisterInteractable(entityId: string): void {
    this.interactables.delete(entityId);
  }

  public registerInteractor(interactor: Interactor): void {
    this.interactors.set(interactor.id, interactor);
  }

  public unregisterInteractor(interactorId: string): void {
    this.interactors.delete(interactorId);
    this.activeTargets.delete(interactorId);
    this.activeGrabs.delete(interactorId);
  }

  public update(intents: readonly InteractionIntentState[]): readonly ResolvedInteraction[] {
    this.lastResolved.length = 0;

    for (const interactor of this.interactors.values()) {
      if (!interactor.enabled) continue;

      const previousTarget = this.activeTargets.get(interactor.id) ?? null;
      const nextTarget = freezeResolution(this.options.resolve(interactor, this.interactables));
      this.activeTargets.set(interactor.id, nextTarget);

      if ((previousTarget?.entity.id ?? null) !== (nextTarget?.entity.id ?? null)) {
        if (previousTarget) {
          this.dispatch(previousTarget, 'hover-exit', interactor, previousTarget, null);
        }

        if (nextTarget) {
          this.dispatch(nextTarget, 'hover-enter', interactor, previousTarget, nextTarget);
        }
      }

      const selectRequested = intents.some((intent) => intent.name === 'select' && intent.active);
      const grabRequested = intents.some((intent) => intent.name === 'grab' && intent.active);
      const releaseRequested = intents.some((intent) => intent.name === 'release' && intent.active);
      const useRequested = intents.some((intent) => intent.name === 'use' && intent.active);
      const teleportRequested = intents.some(
        (intent) => intent.name === 'teleport' && intent.active
      );
      const uiPressRequested = intents.some((intent) => intent.name === 'uiPress' && intent.active);

      if (selectRequested && nextTarget) {
        this.dispatch(nextTarget, 'select-start', interactor, previousTarget, nextTarget);
      }

      if (!selectRequested && previousTarget) {
        this.dispatch(previousTarget, 'select-end', interactor, previousTarget, nextTarget);
      }

      const previousGrab = this.activeGrabs.get(interactor.id) ?? null;
      if (grabRequested && nextTarget && !previousGrab) {
        this.activeGrabs.set(interactor.id, nextTarget);
        this.dispatch(nextTarget, 'grab-start', interactor, previousGrab, nextTarget);
      }

      if ((releaseRequested || !grabRequested) && previousGrab) {
        this.activeGrabs.set(interactor.id, null);
        this.dispatch(previousGrab, 'grab-end', interactor, previousGrab, nextTarget);
      }

      this.lastResolved.push(
        Object.freeze({
          interactorId: interactor.id,
          interactorKind: inferKind(interactor),
          hover: nextTarget,
          grabbed: this.activeGrabs.get(interactor.id) ?? null,
          actions: Object.freeze({
            use: useRequested && Boolean(nextTarget),
            teleport: teleportRequested,
            uiPress: uiPressRequested && Boolean(nextTarget),
          }),
        })
      );
    }

    return Object.freeze([...this.lastResolved]);
  }

  public getResolvedInteractions(): readonly ResolvedInteraction[] {
    return Object.freeze([...this.lastResolved]);
  }

  private dispatch(
    resolution: InteractionResolution,
    type: InteractionEvent['type'],
    interactor: Interactor,
    previous: InteractionResolution | null,
    next: InteractionResolution | null
  ): void {
    const interactable = this.interactables.get(resolution.entity.id);
    if (!interactable) return;

    const event = createEvent(type, interactor, previous, next);

    if (type === 'hover-enter') interactable.onHoverEnter?.(event);
    if (type === 'hover-exit') interactable.onHoverExit?.(event);
    if (type === 'select-start') interactable.onSelectStart?.(event);
    if (type === 'select-end') interactable.onSelectEnd?.(event);
    if (type === 'grab-start') interactable.onGrabStart?.(event);
    if (type === 'grab-end') interactable.onGrabEnd?.(event);
  }
}

export function createControllerInteractor(
  id: string,
  input: ControllerInteractionInput
): Interactor {
  return Object.freeze({
    id,
    enabled: input.trackingValid,
    mode: input.gripPressed ? 'grab' : input.triggerPressed ? 'far' : 'near',
    kind: 'controller',
    ray: input.ray ?? DEFAULT_RAY,
    position: cloneVec3(input.position),
    nearRadius: input.gripPressed ? DEFAULT_GRAB_DISTANCE : DEFAULT_NEAR_DISTANCE,
    uiRadius: DEFAULT_UI_DISTANCE,
    locomotionRequested: toBoolean(input.thumbstickPressed),
    selectPressed: toBoolean(input.triggerPressed),
    grabPressed: toBoolean(input.gripPressed),
    usePressed: toBoolean(input.triggerPressed),
    uiPressed: toBoolean(input.triggerPressed),
  });
}

export function createHandInteractor(id: string, input: HandInteractionInput): Interactor {
  const ray = input.ray ?? {
    origin: input.indexTip,
    direction: Object.freeze({ x: 0, y: 0, z: -1 }),
  };

  const nearRadius = input.pinchStrength >= 0.8 ? DEFAULT_GRAB_DISTANCE : DEFAULT_NEAR_DISTANCE;

  return Object.freeze({
    id,
    enabled: input.trackingValid,
    mode: input.poking ? 'ui' : input.pinching ? 'grab' : input.nearTargeting ? 'near' : 'far',
    kind: 'hand',
    ray,
    position: cloneVec3(input.indexTip),
    nearRadius,
    uiRadius: DEFAULT_UI_DISTANCE,
    locomotionRequested: false,
    selectPressed: input.pinching,
    grabPressed: input.pinching && input.pinchStrength >= 0.8,
    usePressed: input.pinching,
    uiPressed: input.poking,
  });
}

export function deriveInteractionIntents(
  interactor: Interactor
): readonly InteractionIntentState[] {
  return Object.freeze([
    Object.freeze({ name: 'select', active: interactor.selectPressed }),
    Object.freeze({ name: 'grab', active: interactor.grabPressed }),
    Object.freeze({ name: 'release', active: !interactor.grabPressed }),
    Object.freeze({ name: 'use', active: interactor.usePressed }),
    Object.freeze({ name: 'teleport', active: interactor.locomotionRequested }),
    Object.freeze({ name: 'uiPress', active: interactor.uiPressed }),
  ]);
}

export function createInteractionSystem(options: InteractionSystemOptions = {}): InteractionSystem {
  return new InteractionSystemImpl({
    resolve: options.resolve ?? ((interactor) => resolveByDistance(interactor, [])),
  });
}

export function resolveByDistance(
  interactor: Pick<Interactor, 'mode' | 'position' | 'nearRadius' | 'uiRadius'>,
  candidates: readonly InteractionResolution[]
): InteractionResolution | null {
  const maxDistance = interactor.mode === 'ui' ? interactor.uiRadius : interactor.nearRadius;

  let best: InteractionResolution | null = null;

  for (const candidate of candidates) {
    const candidateDistance =
      candidate.distance ??
      (candidate.point && interactor.position
        ? distance(interactor.position, candidate.point)
        : Infinity);

    if (candidateDistance > maxDistance) continue;
    if (!best || candidateDistance < (best.distance ?? Infinity)) {
      best = Object.freeze({
        ...candidate,
        distance: candidateDistance,
      });
    }
  }

  return best;
}
