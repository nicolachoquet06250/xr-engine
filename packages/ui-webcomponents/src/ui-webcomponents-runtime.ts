import XREngine from './components/XREngine.ce.vue';
import XRScene from './components/XRScene.ce.vue';
import XRCamera from './components/XRCamera.ce.vue';
import XREntity from './components/XREntity.ce.vue';
import XRHud from './components/XRHud.ce.vue';
import XRDebugPanel from './components/XRDebugPanel.ce.vue';
import XRHandDebug from './components/XRHandDebug.ce.vue';
import XRInputProfileViewer from './components/XRInputProfileViewer.ce.vue';

import type { RegisterUIWebComponentsOptions, UIWebComponentTagNameMap } from './web-component';
import { type Component, defineCustomElement, type SetupContext } from 'vue';

const defaultTags = Object.freeze({
  engine: 'xr-engine',
  scene: 'xr-scene',
  camera: 'xr-camera',
  entity: 'xr-entity',
  hud: 'xr-hud',
  debugPanel: 'xr-debug-panel',
  handDebug: 'xr-hand-debug',
  inputProfileViewer: 'xr-input-profile-viewer',
});

const registeredTags = new Set<string>();

const componentConstructors = {
  engine: XREngine,
  scene: XRScene,
  camera: XRCamera,
  entity: XREntity,
  hud: XRHud,
  debugPanel: XRDebugPanel,
  handDebug: XRHandDebug,
  inputProfileViewer: XRInputProfileViewer,
} as const;

function defineComponent(tagName: string, component: Component): void {
  if (registeredTags.has(tagName) || customElements.get(tagName)) {
    return;
  }

  const constructor = defineCustomElement(component as (props: any, ctx: SetupContext) => any);

  customElements.define(tagName, constructor);
  registeredTags.add(tagName);
}

export function registerUIWebComponents(options: RegisterUIWebComponentsOptions = {}): void {
  const tags: UIWebComponentTagNameMap = {
    engine: options.tags?.engine ?? defaultTags.engine,
    scene: options.tags?.scene ?? defaultTags.scene,
    camera: options.tags?.camera ?? defaultTags.camera,
    entity: options.tags?.entity ?? defaultTags.entity,
    hud: options.tags?.hud ?? defaultTags.hud,
    debugPanel: options.tags?.debugPanel ?? defaultTags.debugPanel,
    handDebug: options.tags?.handDebug ?? defaultTags.handDebug,
    inputProfileViewer: options.tags?.inputProfileViewer ?? defaultTags.inputProfileViewer,
  };

  defineComponent(tags.engine, componentConstructors.engine);
  defineComponent(tags.scene, componentConstructors.scene);
  defineComponent(tags.camera, componentConstructors.camera);
  defineComponent(tags.entity, componentConstructors.entity);
  defineComponent(tags.hud, componentConstructors.hud);
  defineComponent(tags.debugPanel, componentConstructors.debugPanel);
  defineComponent(tags.handDebug, componentConstructors.handDebug);
  defineComponent(tags.inputProfileViewer, componentConstructors.inputProfileViewer);
}

export const defaultUIWebComponentTags = defaultTags;
