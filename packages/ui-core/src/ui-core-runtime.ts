import type {
  CreateUICoreServicesOptions,
  UIAction,
  UIActionDispatcher,
  UIBridgeSnapshot,
  UICoreServices,
  UIDebugState,
  UIEvent,
  UIEventBus,
  UIFocusManager,
  UIMenuState,
  UINavigator,
  UIOverlayController,
  UIOverlayEntry,
  UIPanelModel,
  UIPanelRegistry,
  UIRouteState,
  UIRuntimeBridge,
  UIState,
  UIStateStore,
  UIStateUpdater,
} from './ui-core';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    return Object.freeze(value);
  }

  return value;
}

function createRouteState(route: string): UIRouteState {
  return Object.freeze({
    current: route,
    previous: null,
    params: Object.freeze({}),
    history: Object.freeze([route]),
  });
}

class UIStateStoreImpl<TState extends object> implements UIStateStore<TState> {
  private current: Readonly<TState>;
  private readonly listeners = new Set<(state: Readonly<TState>) => void>();

  public constructor(initialState: TState) {
    this.current = freeze({ ...initialState });
  }

  public getState(): Readonly<TState> {
    return this.current;
  }

  public setState(update: UIStateUpdater<TState>): Readonly<TState> {
    const partial = typeof update === 'function' ? update(this.current) : update;
    this.current = freeze({ ...this.current, ...partial });

    for (const listener of this.listeners) {
      listener(this.current);
    }

    return this.current;
  }

  public subscribe(listener: (state: Readonly<TState>) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

class UIEventBusImpl implements UIEventBus {
  private readonly listeners = new Map<string, Set<(event: UIEvent<unknown>) => void>>();

  public emit<TPayload = unknown>(event: UIEvent<TPayload>): void {
    const scoped = this.listeners.get(event.type);
    if (!scoped) {
      return;
    }

    for (const listener of scoped) {
      listener(event as UIEvent<unknown>);
    }
  }

  public subscribe<TPayload = unknown>(
    type: string,
    listener: (event: UIEvent<TPayload>) => void
  ): () => void {
    const scoped = this.listeners.get(type) ?? new Set();
    const internal = (event: UIEvent<unknown>): void => {
      listener(event as UIEvent<TPayload>);
    };

    scoped.add(internal);
    this.listeners.set(type, scoped);

    return () => {
      const current = this.listeners.get(type);
      if (!current) {
        return;
      }

      current.delete(internal);
      if (current.size === 0) {
        this.listeners.delete(type);
      }
    };
  }
}

class UIFocusManagerImpl implements UIFocusManager {
  private focusedId: string | null;
  private readonly navigables: string[] = [];

  public constructor(
    initialFocusedId: string | null,
    private readonly store: UIStateStore<UIState>
  ) {
    this.focusedId = initialFocusedId;
  }

  public registerNavigable(id: string): void {
    if (this.navigables.includes(id)) {
      return;
    }

    this.navigables.push(id);
  }

  public unregisterNavigable(id: string): void {
    const index = this.navigables.indexOf(id);
    if (index === -1) {
      return;
    }

    this.navigables.splice(index, 1);
    if (this.focusedId === id) {
      this.blur();
    }
  }

  public focus(id: string): string | null {
    if (!this.navigables.includes(id)) {
      return this.focusedId;
    }

    this.focusedId = id;
    this.store.setState({ focusedId: id });
    return this.focusedId;
  }

  public blur(): void {
    this.focusedId = null;
    this.store.setState({ focusedId: null });
  }

  public focusNext(): string | null {
    if (this.navigables.length === 0) {
      return null;
    }

    if (!this.focusedId) {
      return this.focus(this.navigables[0]);
    }

    const index = this.navigables.indexOf(this.focusedId);
    const nextIndex = index >= 0 ? (index + 1) % this.navigables.length : 0;
    return this.focus(this.navigables[nextIndex]);
  }

  public focusPrevious(): string | null {
    if (this.navigables.length === 0) {
      return null;
    }

    if (!this.focusedId) {
      return this.focus(this.navigables[this.navigables.length - 1]);
    }

    const index = this.navigables.indexOf(this.focusedId);
    const previousIndex =
      index >= 0 ? (index - 1 + this.navigables.length) % this.navigables.length : 0;
    return this.focus(this.navigables[previousIndex]);
  }

  public getFocusedId(): string | null {
    return this.focusedId;
  }

  public getNavigationOrder(): readonly string[] {
    return Object.freeze([...this.navigables]);
  }
}

class UINavigatorImpl implements UINavigator {
  public constructor(private readonly store: UIStateStore<UIState>) {}

  public setRoute(route: string, params: Readonly<Record<string, string>> = {}): void {
    const current = this.store.getState().route;
    const next: UIRouteState = Object.freeze({
      current: route,
      previous: current.current,
      params: Object.freeze({ ...params }),
      history: Object.freeze([...current.history, route]),
    });

    this.store.setState({ route: next });
  }

  public next(): string | null {
    const state = this.store.getState().route;
    if (state.history.length === 0) {
      return null;
    }

    return state.history[state.history.length - 1] ?? null;
  }

  public previous(): string | null {
    return this.store.getState().route.previous;
  }

  public getRoute(): UIRouteState {
    return this.store.getState().route;
  }
}

class UIPanelRegistryImpl implements UIPanelRegistry {
  public constructor(private readonly store: UIStateStore<UIState>) {}

  public register(panel: UIPanelModel): void {
    const current = this.store.getState().panels;
    if (current.some((entry) => entry.id === panel.id)) {
      this.update(panel.id, panel);
      return;
    }

    this.store.setState({ panels: Object.freeze([...current, freeze({ ...panel })]) });
  }

  public update(id: string, patch: Partial<Omit<UIPanelModel, 'id'>>): void {
    const next = this.store
      .getState()
      .panels.map((panel) => (panel.id === id ? freeze({ ...panel, ...patch }) : panel));

    this.store.setState({ panels: Object.freeze(next) });
  }

  public remove(id: string): void {
    const next = this.store.getState().panels.filter((panel) => panel.id !== id);
    this.store.setState({ panels: Object.freeze(next) });
  }

  public setVisible(id: string, visible: boolean): void {
    this.update(id, { visible });
  }

  public list(): readonly UIPanelModel[] {
    return this.store.getState().panels;
  }

  public get(id: string): UIPanelModel | null {
    return this.store.getState().panels.find((panel) => panel.id === id) ?? null;
  }
}

class UIOverlayControllerImpl implements UIOverlayController {
  public constructor(private readonly store: UIStateStore<UIState>) {}

  public set(entry: UIOverlayEntry): void {
    const current = this.store.getState().overlays;
    const exists = current.some((overlay) => overlay.id === entry.id);

    const next = exists
      ? current.map((overlay) => (overlay.id === entry.id ? freeze({ ...entry }) : overlay))
      : [...current, freeze({ ...entry })];

    this.store.setState({ overlays: Object.freeze(next) });
  }

  public toggle(id: string, enabled?: boolean): void {
    const current = this.get(id);
    if (!current) {
      this.set({ id, enabled: enabled ?? true });
      return;
    }

    this.set({ ...current, enabled: enabled ?? !current.enabled });
  }

  public get(id: string): UIOverlayEntry | null {
    return this.store.getState().overlays.find((overlay) => overlay.id === id) ?? null;
  }

  public list(): readonly UIOverlayEntry[] {
    return this.store.getState().overlays;
  }
}

class UIActionDispatcherImpl implements UIActionDispatcher {
  private readonly listeners = new Set<(action: UIAction) => void>();

  public constructor(
    private readonly store: UIStateStore<UIState>,
    private readonly focus: UIFocusManager,
    private readonly navigation: UINavigator,
    private readonly panels: UIPanelRegistry,
    private readonly overlays: UIOverlayController,
    private readonly events: UIEventBus
  ) {}

  public dispatch(action: UIAction): void {
    switch (action.type) {
      case 'ui.route.set':
        this.navigation.setRoute(String(action.payload ?? '/'));
        break;
      case 'ui.focus.set':
        this.focus.focus(String(action.payload ?? ''));
        break;
      case 'ui.focus.clear':
        this.focus.blur();
        break;
      case 'ui.focus.next':
        this.focus.focusNext();
        break;
      case 'ui.focus.previous':
        this.focus.focusPrevious();
        break;
      case 'ui.panel.register':
        this.panels.register(action.payload as UIPanelModel);
        break;
      case 'ui.panel.update': {
        const payload = action.payload as { id: string; patch: Partial<UIPanelModel> };
        this.panels.update(payload.id, payload.patch);
        break;
      }
      case 'ui.panel.remove':
        this.panels.remove(String(action.payload ?? ''));
        break;
      case 'ui.panel.show':
        this.panels.setVisible(String(action.payload ?? ''), true);
        break;
      case 'ui.panel.hide':
        this.panels.setVisible(String(action.payload ?? ''), false);
        break;
      case 'ui.overlay.set':
        this.overlays.set(action.payload as UIOverlayEntry);
        break;
      case 'ui.overlay.toggle': {
        const payload = action.payload as { id: string; enabled?: boolean };
        this.overlays.toggle(payload.id, payload.enabled);
        break;
      }
      case 'ui.menu.open':
        this.patchMenu({ open: true, activePanelId: (action.payload as string | null) ?? null });
        break;
      case 'ui.menu.close':
        this.patchMenu({ open: false, activePanelId: null });
        break;
      case 'ui.debug.enable':
        this.patchDebug({ enabled: true, overlayId: (action.payload as string | null) ?? 'debug' });
        break;
      case 'ui.debug.disable':
        this.patchDebug({ enabled: false, overlayId: null });
        break;
      default:
        break;
    }

    this.events.emit({ type: action.type, payload: action.payload });
    for (const listener of this.listeners) {
      listener(action);
    }
  }

  public subscribe(listener: (action: UIAction) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private patchMenu(patch: Partial<UIMenuState>): void {
    this.store.setState((state) => ({ menu: freeze({ ...state.menu, ...patch }) }));
  }

  private patchDebug(patch: Partial<UIDebugState>): void {
    this.store.setState((state) => ({ debug: freeze({ ...state.debug, ...patch }) }));
  }
}

class UIRuntimeBridgeImpl implements UIRuntimeBridge {
  public constructor(
    private readonly store: UIStateStore<UIState>,
    private readonly actions: UIActionDispatcher
  ) {}

  public getSnapshot(): UIBridgeSnapshot {
    const state = this.store.getState();
    return Object.freeze({
      route: state.route.current,
      focusedId: state.focusedId,
      visiblePanelIds: Object.freeze(
        state.panels.filter((panel) => panel.visible).map((panel) => panel.id)
      ),
      enabledOverlayIds: Object.freeze(
        state.overlays.filter((overlay) => overlay.enabled).map((overlay) => overlay.id)
      ),
      menuOpen: state.menu.open,
      debugEnabled: state.debug.enabled,
    });
  }

  public subscribe(listener: (snapshot: UIBridgeSnapshot) => void): () => void {
    return this.store.subscribe(() => {
      listener(this.getSnapshot());
    });
  }

  public dispatch(action: UIAction): void {
    this.actions.dispatch(action);
  }
}

export function createUICoreServices(options: CreateUICoreServicesOptions = {}): UICoreServices {
  const initialPanels = Object.freeze(
    [...(options.initialPanels ?? [])].map((panel) => freeze({ ...panel }))
  );
  const initialOverlays = Object.freeze(
    [...(options.initialOverlays ?? [])].map((overlay) => freeze({ ...overlay }))
  );

  const initialState: UIState = Object.freeze({
    route: createRouteState(options.initialRoute ?? '/'),
    focusedId: options.initialFocusedId ?? null,
    panels: initialPanels,
    overlays: initialOverlays,
    menu: freeze({
      open: options.menuOpen ?? false,
      activePanelId: null,
    }),
    debug: freeze({
      enabled: options.debugEnabled ?? false,
      overlayId: options.debugEnabled ? 'debug' : null,
    }),
  });

  const store = new UIStateStoreImpl(initialState);
  const events = new UIEventBusImpl();
  const focus = new UIFocusManagerImpl(initialState.focusedId, store);
  const navigation = new UINavigatorImpl(store);
  const panels = new UIPanelRegistryImpl(store);
  const overlays = new UIOverlayControllerImpl(store);
  const actions = new UIActionDispatcherImpl(store, focus, navigation, panels, overlays, events);
  const bridge = new UIRuntimeBridgeImpl(store, actions);

  return Object.freeze({
    store,
    events,
    actions,
    focus,
    navigation,
    panels,
    overlays,
    bridge,
  });
}
