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

/**
 * Composant racine qui encapsule les services UI moteur.
 */
export interface XREngineElement extends HTMLElement {
  engine?: unknown;
  getSnapshot(): UIBridgeSnapshot;
  dispatchUIAction(action: UIAction): void;
  attachRuntime(runtime: unknown): void;
  detachRuntime(): void;
}

export interface XRSceneElement extends HTMLElement {}
export interface XRCameraElement extends HTMLElement {}
export interface XREntityElement extends HTMLElement {}
export interface XRHudElement extends HTMLElement {}
export interface XRDebugPanelElement extends HTMLElement {}
export interface XRHandDebugElement extends HTMLElement {}
export interface XRInputProfileViewerElement extends HTMLElement {}

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
