export type UIActionType =
  | 'ui.route.set'
  | 'ui.focus.set'
  | 'ui.focus.clear'
  | 'ui.focus.next'
  | 'ui.focus.previous'
  | 'ui.panel.register'
  | 'ui.panel.update'
  | 'ui.panel.remove'
  | 'ui.panel.show'
  | 'ui.panel.hide'
  | 'ui.overlay.set'
  | 'ui.overlay.toggle'
  | 'ui.menu.open'
  | 'ui.menu.close'
  | 'ui.debug.enable'
  | 'ui.debug.disable'
  | (string & {});

export interface UIAction<TPayload = unknown> {
  readonly type: UIActionType;
  readonly payload?: TPayload;
}

export interface UIRouteState {
  readonly current: string;
  readonly previous: string | null;
  readonly params: Readonly<Record<string, string>>;
  readonly history: readonly string[];
}

export type UIPanelKind = 'menu' | 'debug' | 'overlay' | 'hud' | 'custom';

export interface UIPanelModel {
  readonly id: string;
  readonly kind: UIPanelKind;
  readonly title?: string;
  readonly route?: string;
  readonly visible: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface UIOverlayEntry {
  readonly id: string;
  readonly enabled: boolean;
  readonly panelId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface UIMenuState {
  readonly open: boolean;
  readonly activePanelId: string | null;
}

export interface UIDebugState {
  readonly enabled: boolean;
  readonly overlayId: string | null;
}

export interface UIState {
  readonly route: UIRouteState;
  readonly focusedId: string | null;
  readonly panels: readonly UIPanelModel[];
  readonly overlays: readonly UIOverlayEntry[];
  readonly menu: UIMenuState;
  readonly debug: UIDebugState;
}

export type UIStateUpdater<TState> =
  | Partial<TState>
  | ((current: Readonly<TState>) => Partial<TState> | TState);

export interface UIStateStore<TState = UIState> {
  getState(): Readonly<TState>;
  setState(update: UIStateUpdater<TState>): Readonly<TState>;
  subscribe(listener: (state: Readonly<TState>) => void): () => void;
}

export interface UIEvent<TPayload = unknown> {
  readonly type: string;
  readonly payload?: TPayload;
}

export interface UIEventBus {
  emit<TPayload = unknown>(event: UIEvent<TPayload>): void;
  subscribe<TPayload = unknown>(
    type: string,
    listener: (event: UIEvent<TPayload>) => void
  ): () => void;
}

export interface UIFocusManager {
  registerNavigable(id: string): void;
  unregisterNavigable(id: string): void;
  focus(id: string): string | null;
  blur(): void;
  focusNext(): string | null;
  focusPrevious(): string | null;
  getFocusedId(): string | null;
  getNavigationOrder(): readonly string[];
}

export interface UINavigator {
  setRoute(route: string, params?: Readonly<Record<string, string>>): void;
  next(): string | null;
  previous(): string | null;
  getRoute(): UIRouteState;
}

export interface UIPanelRegistry {
  register(panel: UIPanelModel): void;
  update(id: string, patch: Partial<Omit<UIPanelModel, 'id'>>): void;
  remove(id: string): void;
  setVisible(id: string, visible: boolean): void;
  list(): readonly UIPanelModel[];
  get(id: string): UIPanelModel | null;
}

export interface UIOverlayController {
  set(entry: UIOverlayEntry): void;
  toggle(id: string, enabled?: boolean): void;
  get(id: string): UIOverlayEntry | null;
  list(): readonly UIOverlayEntry[];
}

export interface UIActionDispatcher {
  dispatch(action: UIAction): void;
  subscribe(listener: (action: UIAction) => void): () => void;
}

export interface UIBridgeSnapshot {
  readonly route: string;
  readonly focusedId: string | null;
  readonly visiblePanelIds: readonly string[];
  readonly enabledOverlayIds: readonly string[];
  readonly menuOpen: boolean;
  readonly debugEnabled: boolean;
}

export interface UIRuntimeBridge {
  getSnapshot(): UIBridgeSnapshot;
  subscribe(listener: (snapshot: UIBridgeSnapshot) => void): () => void;
  dispatch(action: UIAction): void;
}

export interface UICoreServices {
  readonly store: UIStateStore<UIState>;
  readonly events: UIEventBus;
  readonly actions: UIActionDispatcher;
  readonly focus: UIFocusManager;
  readonly navigation: UINavigator;
  readonly panels: UIPanelRegistry;
  readonly overlays: UIOverlayController;
  readonly bridge: UIRuntimeBridge;
}

export interface CreateUICoreServicesOptions {
  readonly initialRoute?: string;
  readonly initialPanels?: readonly UIPanelModel[];
  readonly initialOverlays?: readonly UIOverlayEntry[];
  readonly initialFocusedId?: string | null;
  readonly menuOpen?: boolean;
  readonly debugEnabled?: boolean;
}

export declare function createUICoreServices(options?: CreateUICoreServicesOptions): UICoreServices;
