import { describe, expect, it } from 'vitest';
import { createGameplayServices } from '../index';
import type { Entity } from '@xr-engine/scene';

describe('gameplay layer - spawn and composition', () => {
  it('spawns/despawns entities via prefab services and composes blueprints', async () => {
    const services = createGameplayServices();
    const lifecycle: string[] = [];
    const entity = { id: 'npc-1' } as unknown as Entity;

    services.spawn.registerPrefab({
      prefab: 'npc',
      async spawn(request) {
        lifecycle.push(`spawn:${request.prefab}`);
        return entity;
      },
      async despawn(despawned) {
        lifecycle.push(`despawn:${despawned.id}`);
      },
    });

    const spawned = await services.spawn.spawn({ prefab: 'npc' });
    await services.spawn.despawn(spawned);

    services.composer.register({
      id: 'npc-default',
      prefab: 'npc',
      tags: ['enemy'],
      metadata: { hp: 100 },
    });

    const composed = services.composer.compose('npc-default', {
      tags: ['arena'],
      spawn: { position: { x: 1, y: 0, z: -3 } },
      metadata: { hp: 120 },
    });

    expect(lifecycle).toEqual(['spawn:npc', 'despawn:npc-1']);
    expect(composed.spawn.prefab).toBe('npc');
    expect(composed.tags).toEqual(['enemy', 'arena']);
    expect(composed.metadata).toEqual({ hp: 120 });
    expect(composed.spawn.position).toEqual({ x: 1, y: 0, z: -3 });
  });
});

describe('gameplay layer - state machine and behaviour scripts', () => {
  it('transitions game state and updates scripts with context snapshots', async () => {
    const services = createGameplayServices({
      initialGameValue: { score: 0 },
      apis: { engine: { id: 'runtime' } },
    });

    const order: string[] = [];
    const updates: number[] = [];

    services.state.register({
      id: 'menu',
      enter: () => {
        order.push('menu-enter');
      },
      exit: () => {
        order.push('menu-exit');
      },
    });

    services.state.register({
      id: 'playing',
      enter: (context) => {
        order.push(`playing-enter:${context.gameState.current}`);
      },
      update: (deltaTime) => {
        updates.push(deltaTime);
      },
    });

    services.scripts.add({
      id: 'score-behaviour',
      onStart: (context) => {
        order.push(`start:${String((context.apis.engine as { id: string }).id)}`);
      },
      onUpdate: (deltaTime, context) => {
        updates.push(deltaTime + Number(context.gameState.value.score));
      },
      onDestroy: () => {
        order.push('destroy');
      },
    });

    await services.state.transitionTo('menu');
    await services.state.transitionTo('playing');

    services.state.patchValue({ score: 4 });
    services.scripts.startAll();
    services.state.update(0.016);
    services.scripts.update(0.02);
    services.scripts.destroyAll();

    expect(order).toEqual([
      'menu-enter',
      'menu-exit',
      'playing-enter:playing',
      'start:runtime',
      'destroy',
    ]);
    expect(services.state.getSnapshot()).toEqual({
      current: 'playing',
      previous: 'menu',
      value: { score: 4 },
    });
    expect(updates).toEqual([0.016, 4.02]);
  });
});

describe('gameplay layer - selection and business interactions', () => {
  it('selects entities through rules and dispatches domain interactions', async () => {
    const services = createGameplayServices();
    const actor = { id: 'player' } as unknown as Entity;
    const a = { id: 'crate' } as unknown as Entity;
    const b = { id: 'terminal' } as unknown as Entity;

    services.selection.registerRule({
      id: 'has-interactable-tag',
      evaluate(candidate) {
        return { pass: candidate.tags?.includes('interactable') ?? false, weight: 0 };
      },
    });

    services.selection.registerRule({
      id: 'prefer-priority',
      evaluate(candidate) {
        return { pass: true, weight: Number(candidate.metadata?.priority ?? 0) };
      },
    });

    const picked = services.selection.select(
      [
        { entity: a, tags: ['interactable'], metadata: { priority: 1 } },
        { entity: b, tags: ['interactable'], metadata: { priority: 4 } },
      ],
      { actor, event: { type: 'select' } }
    );

    const handled: string[] = [];

    services.interactions.register({
      id: 'select-terminal',
      matches(event) {
        return event.type === 'select' && picked?.entity.id === 'terminal';
      },
      execute(event) {
        handled.push(`handled:${event.type}`);
      },
    });

    services.interactions.register({
      id: 'ignore-other-events',
      matches(event) {
        return event.type === 'menu';
      },
      execute() {
        handled.push('should-not-run');
      },
    });

    const count = await services.interactions.dispatch({
      type: 'select',
      payload: { actor: actor.id },
    });

    expect(picked?.entity.id).toBe('terminal');
    expect(count).toBe(1);
    expect(handled).toEqual(['handled:select']);
  });
});
