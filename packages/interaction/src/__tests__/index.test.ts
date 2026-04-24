import { describe, expect, it } from 'vitest';

import {
  createControllerInteractor,
  createHandInteractor,
  createInteractionSystem,
  deriveInteractionIntents,
  resolveByDistance,
} from '../index';
import type { Entity } from '@xr-engine/scene';
import type { Interactable, InteractionResolution } from '../interaction';

const entityA = { id: 'entity-a' } as unknown as Entity;
const entityB = { id: 'entity-b' } as unknown as Entity;

describe('interaction package - interaction modes (far/near/grab/ui/locomotion)', () => {
  it('resolves near and ui interaction targets by distance', () => {
    const candidates: InteractionResolution[] = [
      {
        entity: entityA,
        point: { x: 0, y: 0, z: 0.25 },
      },
      {
        entity: entityB,
        point: { x: 0, y: 0, z: 0.01 },
      },
    ];

    const near = resolveByDistance(
      {
        mode: 'near',
        position: { x: 0, y: 0, z: 0 },
        nearRadius: 0.3,
        uiRadius: 0.02,
      },
      candidates
    );

    expect(near?.entity.id).toBe('entity-b');

    const ui = resolveByDistance(
      {
        mode: 'ui',
        position: { x: 0, y: 0, z: 0 },
        nearRadius: 0.3,
        uiRadius: 0.015,
      },
      candidates
    );

    expect(ui?.entity.id).toBe('entity-b');
  });
});

describe('interaction package - controller mapping (ray pointer, grip grab, trigger use)', () => {
  it('builds a controller interactor with ray + grab + use + locomotion semantics', () => {
    const interactor = createControllerInteractor('right-controller', {
      trackingValid: true,
      position: { x: 0.2, y: 1.4, z: -0.3 },
      ray: {
        origin: { x: 0.2, y: 1.4, z: -0.3 },
        direction: { x: 0, y: -0.1, z: -1 },
      },
      triggerPressed: 0.9,
      gripPressed: true,
      thumbstickPressed: true,
    });

    expect(interactor.mode).toBe('grab');
    expect(interactor.grabPressed).toBe(true);
    expect(interactor.usePressed).toBe(true);
    expect(interactor.locomotionRequested).toBe(true);
    expect(interactor.ray.origin).toEqual({ x: 0.2, y: 1.4, z: -0.3 });
  });
});

describe('interaction package - hand tracking mapping (pinch/poke/near/ray fallback)', () => {
  it('maps hand-tracking features to a hand interactor profile', () => {
    const interactor = createHandInteractor('left-hand', {
      trackingValid: true,
      indexTip: { x: -0.1, y: 1.3, z: -0.25 },
      pinchStrength: 0.85,
      pinching: true,
      poking: false,
      nearTargeting: true,
    });

    expect(interactor.mode).toBe('grab');
    expect(interactor.grabPressed).toBe(true);
    expect(interactor.selectPressed).toBe(true);
    expect(interactor.ray.origin).toEqual({ x: -0.1, y: 1.3, z: -0.25 });

    const pokeInteractor = createHandInteractor('right-hand', {
      trackingValid: true,
      indexTip: { x: 0.1, y: 1.3, z: -0.25 },
      pinchStrength: 0.1,
      pinching: false,
      poking: true,
      nearTargeting: true,
    });

    expect(pokeInteractor.mode).toBe('ui');
    expect(pokeInteractor.uiPressed).toBe(true);
  });
});

describe('interaction package - gameplay rule must stay device-agnostic', () => {
  it('derives the same interaction intents for hand and controller interactors', () => {
    const fromController = deriveInteractionIntents(
      createControllerInteractor('controller', {
        trackingValid: true,
        position: { x: 0, y: 0, z: 0 },
        triggerPressed: true,
        gripPressed: false,
      })
    );

    const fromHand = deriveInteractionIntents(
      createHandInteractor('hand', {
        trackingValid: true,
        indexTip: { x: 0, y: 0, z: 0 },
        pinchStrength: 0.6,
        pinching: true,
        poking: false,
        nearTargeting: true,
      })
    );

    expect(fromController.find((intent) => intent.name === 'select')?.active).toBe(true);
    expect(fromHand.find((intent) => intent.name === 'select')?.active).toBe(true);
  });

  it('dispatches lifecycle events using normalized intents, not device-specific checks', () => {
    const events: string[] = [];

    const interactable: Interactable = {
      entity: entityA,
      onHoverEnter: () => events.push('hover-enter'),
      onHoverExit: () => events.push('hover-exit'),
      onSelectStart: () => events.push('select-start'),
      onSelectEnd: () => events.push('select-end'),
      onGrabStart: () => events.push('grab-start'),
      onGrabEnd: () => events.push('grab-end'),
    };

    const system = createInteractionSystem({
      resolve: () => ({
        entity: entityA,
        point: { x: 0, y: 0, z: 0.1 },
      }),
    });

    const interactor = createControllerInteractor('controller', {
      trackingValid: true,
      position: { x: 0, y: 1.4, z: -0.3 },
      triggerPressed: true,
      gripPressed: true,
      thumbstickPressed: false,
    });

    system.registerInteractable(interactable);
    system.registerInteractor(interactor);

    const firstFrame = system.update(deriveInteractionIntents(interactor));
    expect(firstFrame[0]?.hover?.entity.id).toBe('entity-a');
    expect(firstFrame[0]?.grabbed?.entity.id).toBe('entity-a');

    const releaseInteractor = createControllerInteractor('controller', {
      trackingValid: true,
      position: { x: 0, y: 1.4, z: -0.3 },
      triggerPressed: false,
      gripPressed: false,
      thumbstickPressed: false,
    });

    system.registerInteractor(releaseInteractor);
    system.update(deriveInteractionIntents(releaseInteractor));

    expect(events).toEqual([
      'hover-enter',
      'select-start',
      'grab-start',
      'select-end',
      'grab-end',
    ]);
  });
});
