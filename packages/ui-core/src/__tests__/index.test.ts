import { describe, expect, it } from 'vitest';
import { createUICoreServices } from '../index';

describe('ui-core layer - state, focus and navigation', () => {
  it('maintains framework-agnostic UI state with focus and internal route navigation', () => {
    const ui = createUICoreServices({
      initialRoute: '/boot',
      initialPanels: [{ id: 'hud', kind: 'hud', visible: true }],
    });

    ui.focus.registerNavigable('menu.play');
    ui.focus.registerNavigable('menu.settings');

    ui.actions.dispatch({ type: 'ui.focus.next' });
    ui.actions.dispatch({ type: 'ui.focus.next' });
    ui.actions.dispatch({ type: 'ui.route.set', payload: '/menu' });

    expect(ui.focus.getFocusedId()).toBe('menu.settings');
    expect(ui.navigation.getRoute()).toEqual({
      current: '/menu',
      previous: '/boot',
      params: {},
      history: ['/boot', '/menu'],
    });
    expect(ui.panels.list().map((panel) => panel.id)).toEqual(['hud']);
  });
});

describe('ui-core layer - actions, panels and overlays', () => {
  it('dispatches UI actions to panel and overlay models including menu/debug states', () => {
    const ui = createUICoreServices();

    ui.actions.dispatch({
      type: 'ui.panel.register',
      payload: { id: 'main-menu', kind: 'menu', title: 'Main menu', visible: false },
    });
    ui.actions.dispatch({ type: 'ui.panel.show', payload: 'main-menu' });
    ui.actions.dispatch({ type: 'ui.overlay.toggle', payload: { id: 'debug-overlay' } });
    ui.actions.dispatch({ type: 'ui.menu.open', payload: 'main-menu' });
    ui.actions.dispatch({ type: 'ui.debug.enable', payload: 'debug-overlay' });

    expect(ui.panels.get('main-menu')?.visible).toBe(true);
    expect(ui.overlays.get('debug-overlay')?.enabled).toBe(true);
    expect(ui.store.getState().menu).toEqual({ open: true, activePanelId: 'main-menu' });
    expect(ui.store.getState().debug).toEqual({ enabled: true, overlayId: 'debug-overlay' });
  });
});

describe('ui-core layer - runtime to view bridge', () => {
  it('exposes bridge snapshots for Vue/WebComponents and emits action events', () => {
    const ui = createUICoreServices();
    const actionTypes: string[] = [];
    const snapshots: string[] = [];

    ui.events.subscribe('ui.panel.register', (event) => {
      actionTypes.push(event.type);
    });

    const unsubscribe = ui.bridge.subscribe((snapshot) => {
      snapshots.push(snapshot.route);
    });

    ui.bridge.dispatch({
      type: 'ui.panel.register',
      payload: { id: 'hud', kind: 'hud', visible: true },
    });
    ui.bridge.dispatch({ type: 'ui.route.set', payload: '/play' });

    const snapshot = ui.bridge.getSnapshot();

    expect(actionTypes).toEqual(['ui.panel.register']);
    expect(snapshots).toContain('/play');
    expect(snapshot).toEqual({
      route: '/play',
      focusedId: null,
      visiblePanelIds: ['hud'],
      enabledOverlayIds: [],
      menuOpen: false,
      debugEnabled: false,
    });

    unsubscribe();
  });
});
