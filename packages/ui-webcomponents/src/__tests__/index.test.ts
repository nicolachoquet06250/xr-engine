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

  it('expose un contrat événementiel et un snapshot utile sur xr-engine', async () => {
    const element = document.createElement(defaultUIWebComponentTags.engine);

    const ready = new Promise<CustomEvent>((resolve) => {
      element.addEventListener('xr-engine-ready', (event) => resolve(event as CustomEvent), {
        once: true,
      });
    });

    const snapshots: unknown[] = [];
    element.addEventListener('xr-ui-snapshot', (event) => {
      snapshots.push((event as CustomEvent).detail);
    });

    document.body.append(element);

    const readyEvent = await ready;
    expect(readyEvent.detail[0].route).toBe('/');
    expect(typeof readyEvent.detail[0].debugEnabled).toBe('boolean');

    (
      element as unknown as { dispatchUIAction: (action: { type: string }) => void }
    ).dispatchUIAction({
      type: 'ui.debug.enable',
    });

    const currentSnapshot = (
      element as unknown as { getSnapshot: () => { debugEnabled: boolean } }
    ).getSnapshot();
    expect(currentSnapshot.debugEnabled).toBe(true);
    expect(snapshots.length).toBeGreaterThan(0);

    document.body.removeChild(element);
  });

  it('implémente des comportements publics sur xr-scene et xr-hud', () => {
    const scene = document.createElement(defaultUIWebComponentTags.scene) as unknown as {
      setActive: (active: boolean) => void;
      setLoaded: (loaded: boolean) => void;
      getState: () => { active: boolean; loaded: boolean };
    };

    const hud = document.createElement(defaultUIWebComponentTags.hud) as unknown as {
      show: () => void;
      hide: () => void;
      toggle: () => boolean;
      getState: () => { visible: boolean };
    };

    document.body.append(scene as unknown as Node);
    document.body.append(hud as unknown as Node);

    scene.setActive(false);
    scene.setLoaded(true);
    expect(scene.getState()).toMatchObject({ active: false, loaded: true });

    hud.hide();
    expect(hud.getState().visible).toBe(false);
    hud.show();
    expect(hud.getState().visible).toBe(true);
    expect(typeof hud.toggle()).toBe('boolean');

    document.body.removeChild(scene as unknown as Node);
    document.body.removeChild(hud as unknown as Node);
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
