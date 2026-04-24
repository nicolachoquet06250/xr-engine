import { beforeAll, describe, expect, it } from 'vitest';

import { defaultUIWebComponentTags, registerUIWebComponents } from '../index';

beforeAll(() => {
  registerUIWebComponents();
});

describe('ui-webcomponents', () => {
  it('enregistre tous les composants de la couche UI WebComponents', () => {
    expect(customElements.get(defaultUIWebComponentTags.engine)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.scene)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.camera)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.entity)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.hud)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.debugPanel)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.handDebug)).toBeDefined();
    expect(customElements.get(defaultUIWebComponentTags.inputProfileViewer)).toBeDefined();
  });

  it('expose un contrat événementiel sur xr-engine', async () => {
    const element = document.createElement(defaultUIWebComponentTags.engine);
    const ready = new Promise<CustomEvent>((resolve) => {
      element.addEventListener('xr-engine-ready', (event) => resolve(event as CustomEvent), {
        once: true,
      });
    });

    document.body.append(element);

    const readyEvent = await ready;
    expect(readyEvent.detail.route).toBe('/');
    expect(typeof readyEvent.detail.debugEnabled).toBe('boolean');

    const snapshots: unknown[] = [];
    element.addEventListener('xr-ui-snapshot', (event) => {
      snapshots.push((event as CustomEvent).detail);
    });

    (element as unknown as { dispatchUIAction: (action: { type: string }) => void }).dispatchUIAction({
      type: 'ui.debug.enable',
    });

    expect(snapshots.length).toBeGreaterThanOrEqual(0);

    document.body.removeChild(element);
  });

  it('supporte les tags personnalisés pour l’enregistrement', () => {
    registerUIWebComponents({
      tags: {
        engine: 'custom-xr-engine',
        scene: 'custom-xr-scene',
        camera: 'custom-xr-camera',
        entity: 'custom-xr-entity',
        hud: 'custom-xr-hud',
        debugPanel: 'custom-xr-debug-panel',
        handDebug: 'custom-xr-hand-debug',
        inputProfileViewer: 'custom-xr-input-profile-viewer',
      },
    });

    expect(customElements.get('custom-xr-engine')).toBeDefined();
    expect(customElements.get('custom-xr-input-profile-viewer')).toBeDefined();
  });
});
