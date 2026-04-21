export interface XREngineElement extends HTMLElement {
  engine?: unknown;
}

export interface XRSceneElement extends HTMLElement {}
export interface XRCameraElement extends HTMLElement {}
export interface XREntityElement extends HTMLElement {}
export interface XRHudElement extends HTMLElement {}
export interface XRDebugPanelElement extends HTMLElement {}
export interface XRHandDebugElement extends HTMLElement {}
export interface XRInputProfileViewerElement extends HTMLElement {}
export interface XRSceneInspectorElement extends HTMLElement {}

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
    'xr-scene-inspector': XRSceneInspectorElement;
  }
}

export {};
