import type { UIAction, UIBridgeSnapshot } from '@xr-engine/ui-core';

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
 *
 * Props:
 * - route: route UI courante
 * - debug: active le mode debug UI
 * - menuOpen: ouvre/ferme le menu UI
 *
 * Méthodes publiques:
 * - getSnapshot()
 * - dispatchUIAction(action)
 * - attachRuntime(runtime)
 * - detachRuntime()
 */
export interface XREngineElement extends HTMLElement {
  engine?: unknown;
  getSnapshot(): UIBridgeSnapshot;
  dispatchUIAction(action: UIAction): void;
  attachRuntime(runtime: unknown): void;
  detachRuntime(): void;
}

/** Composant de déclaration de scène UI. */
export interface XRSceneElement extends HTMLElement {
  setActive(active: boolean): void;
}

/** Composant de déclaration caméra UI. */
export interface XRCameraElement extends HTMLElement {
  setActive(active: boolean): void;
}

/** Composant de déclaration entité UI. */
export interface XREntityElement extends HTMLElement {
  setVisible(visible: boolean): void;
  setSelected(selected: boolean): void;
}

/** Composant HUD UI. */
export interface XRHudElement extends HTMLElement {
  show(): void;
  hide(): void;
}

/** Panneau debug UI. */
export interface XRDebugPanelElement extends HTMLElement {}

/** Overlay debug hand tracking. */
export interface XRHandDebugElement extends HTMLElement {}

/** Viewer de profil d'input normalisé. */
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
