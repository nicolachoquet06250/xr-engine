export interface UIAction<TPayload = unknown> {
  readonly type: string;
  readonly payload?: TPayload;
}

export interface UIBridgeSnapshot {
  readonly route: string;
  readonly focusedId: string | null;
  readonly visiblePanelIds: readonly string[];
  readonly enabledOverlayIds: readonly string[];
  readonly menuOpen: boolean;
  readonly debugEnabled: boolean;
}

export interface XREngineReadyEventDetail {
  readonly route: string;
  readonly debugEnabled: boolean;
}

export interface XREngineDestroyedEventDetail {
  readonly route: string;
}

export interface XRRuntimeAttachedEventDetail {
  readonly runtimeAttached: boolean;
}

export interface XREngineEvents {
  'xr-engine-ready': XREngineReadyEventDetail;
  'xr-engine-destroyed': XREngineDestroyedEventDetail;
  'xr-ui-snapshot': UIBridgeSnapshot;
  'xr-runtime-attached': XRRuntimeAttachedEventDetail;
}

export interface XREngineElement extends HTMLElement {
  engine?: unknown;
  getSnapshot(): UIBridgeSnapshot;
  dispatchUIAction(action: UIAction): void;
  attachRuntime(runtime: unknown): void;
  detachRuntime(): void;
}

export interface XRSceneElement extends HTMLElement {
  setSceneId(sceneId: string): void;
  setActive(active: boolean): void;
  setLoaded(loaded: boolean): void;
  getState(): { sceneId: string; active: boolean; loaded: boolean };
}

export interface XRCameraElement extends HTMLElement {
  bindToEntity(entityId: string): void;
  setActive(active: boolean): void;
  setProjection(fov: number, near: number, far: number): void;
  getState(): { entityId: string; active: boolean; fov: number; near: number; far: number };
}

export interface XREntityElement extends HTMLElement {
  setVisible(visible: boolean): void;
  setSelected(selected: boolean): void;
  setEnabled(enabled: boolean): void;
  setParent(parentId: string | null): void;
  getState(): {
    entityId: string;
    parentId: string | null;
    visible: boolean;
    selected: boolean;
    enabled: boolean;
  };
}

export interface XRHudElement extends HTMLElement {
  show(): void;
  hide(): void;
  toggle(): boolean;
  setAnchor(anchor: 'screen' | 'world'): void;
  getState(): {
    panelId: string;
    overlayId: string;
    visible: boolean;
    anchor: 'screen' | 'world';
  };
}

export interface XRDebugPanelElement extends HTMLElement {
  openPanel(): void;
  closePanel(): void;
  toggle(): boolean;
  setMetricsTarget(metricsTarget: string): void;
  getState(): { open: boolean; metricsTarget: string; refreshRate: number };
}

export interface XRHandDebugElement extends HTMLElement {
  setVisibilityFlags(next: { showJoints?: boolean; showPinch?: boolean; showPoke?: boolean }): void;
  updateTracking(next: {
    trackingValid: boolean;
    pinchStrength: number;
    pokeDistance: number;
  }): void;
  getState(): {
    hand: 'left' | 'right';
    showJoints: boolean;
    showPinch: boolean;
    showPoke: boolean;
    trackingValid: boolean;
    pinchStrength: number;
    pokeDistance: number;
  };
}

export interface XRInputProfileViewerElement extends HTMLElement {
  setProfile(profileId: string, deviceKind: string): void;
  setLayout(layout: 'grid' | 'list'): void;
  focusControl(controlId: string | null): void;
  reset(): void;
  getState(): {
    profileId: string;
    deviceKind: string;
    layout: 'grid' | 'list';
    activeControl: string | null;
  };
}

export interface UIWebComponentTagNameMap {
  readonly engine: string;
  readonly scene: string;
  readonly camera: string;
  readonly entity: string;
  readonly hud: string;
  readonly debugPanel: string;
  readonly handDebug: string;
  readonly inputProfileViewer: string;
}

export interface RegisterUIWebComponentsOptions {
  readonly tags?: Partial<UIWebComponentTagNameMap>;
}

declare global {
  interface HTMLElementTagNameMap {
    'xr-engine': XREngineElement;
    'xr-scene': XRSceneElement;
    'xr-camera': XRCameraElement;
    'xr-entity': XREntityElement;
    'xr-hud': XRHudElement;
    'xr-debug-panel': XRDebugPanelElement;
    'xr-hand-debug': XRHandDebugElement;
    'xr-input-profile-viewer': XRInputProfileViewerElement;
  }
}

export {};
