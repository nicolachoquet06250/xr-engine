import { defineCustomElement, getCurrentInstance, h, onMounted, onUnmounted, watch } from 'vue';

import type {
  RegisterUIWebComponentsOptions,
  UIAction,
  UIBridgeSnapshot,
  UIWebComponentTagNameMap,
  XREngineElement,
  XREngineEvents,
} from './web-component';

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

function emit<TName extends keyof XREngineEvents>(
  target: HTMLElement,
  name: TName,
  detail: XREngineEvents[TName]
): void;
function emit(target: HTMLElement, name: string, detail: unknown): void {
  target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}

function currentHost<TElement extends HTMLElement>(): TElement | null {
  const instance = getCurrentInstance();
  return (instance?.vnode.el as TElement | null) ?? null;
}

function createSnapshot(route: string, debugEnabled: boolean, menuOpen: boolean): UIBridgeSnapshot {
  return Object.freeze({
    route,
    focusedId: null,
    visiblePanelIds: Object.freeze([]),
    enabledOverlayIds: Object.freeze([]),
    menuOpen,
    debugEnabled,
  });
}

function defineEngineElement(tagName: string): void {
  const EngineElement = defineCustomElement({
    props: {
      route: { type: String, default: '/' },
      debug: { type: Boolean, default: false },
      menuOpen: { type: Boolean, default: false },
    },
    setup(props, { expose, slots }) {
      let host: XREngineElement | null = null;
      let runtimeAttached = false;

      const state = {
        route: props.route,
        debug: props.debug,
        menuOpen: props.menuOpen,
      };

      const publishSnapshot = (): void => {
        if (!host) return;
        emit(host, 'xr-ui-snapshot', createSnapshot(state.route, state.debug, state.menuOpen));
      };

      const dispatchUIAction = (action: UIAction): void => {
        if (action.type === 'ui.debug.enable') state.debug = true;
        if (action.type === 'ui.debug.disable') state.debug = false;
        if (action.type === 'ui.menu.open') state.menuOpen = true;
        if (action.type === 'ui.menu.close') state.menuOpen = false;
        if (action.type === 'ui.route.set' && typeof action.payload === 'string') state.route = action.payload;
        publishSnapshot();
      };

      onMounted(() => {
        host = currentHost<XREngineElement>();
        if (!host) return;

        emit(host, 'xr-engine-ready', {
          route: state.route,
          debugEnabled: state.debug,
        });
        publishSnapshot();
      });

      onUnmounted(() => {
        if (!host) return;
        emit(host, 'xr-engine-destroyed', { route: state.route });
      });

      watch(() => props.route, (route) => {
        state.route = route;
        publishSnapshot();
      });

      watch(() => props.debug, (enabled) => {
        state.debug = enabled;
        publishSnapshot();
      });

      watch(() => props.menuOpen, (open) => {
        state.menuOpen = open;
        publishSnapshot();
      });

      expose({
        getSnapshot: (): UIBridgeSnapshot => createSnapshot(state.route, state.debug, state.menuOpen),
        dispatchUIAction,
        attachRuntime: (runtime: unknown): void => {
          if (!host) return;
          host.engine = runtime;
          runtimeAttached = true;
          emit(host, 'xr-runtime-attached', { runtimeAttached });
        },
        detachRuntime: (): void => {
          if (!host || !runtimeAttached) return;
          host.engine = undefined;
          runtimeAttached = false;
          emit(host, 'xr-runtime-attached', { runtimeAttached });
        },
      });

      return () => h('section', { part: 'root', 'data-component': tagName }, slots.default?.() ?? []);
    },
  });

  customElements.define(tagName, EngineElement);
}

type SimpleMethodsFactory = (getHost: () => HTMLElement | null) => Record<string, (...args: any[]) => void>;

function defineSimpleElement(
  tagName: string,
  config: {
    props: Record<string, unknown>;
    mountedEvent: string;
    unmountedEvent: string;
    methods?: SimpleMethodsFactory;
  }
): void {
  const Element = defineCustomElement({
    props: config.props,
    setup(_props, { expose, slots }) {
      let host: HTMLElement | null = null;
      const getHost = (): HTMLElement | null => host;

      onMounted(() => {
        host = currentHost<HTMLElement>();
        if (!host) return;
        emit(host, config.mountedEvent, {});
      });

      onUnmounted(() => {
        if (!host) return;
        emit(host, config.unmountedEvent, {});
      });

      if (config.methods) {
        expose(config.methods(getHost));
      }

      return () => h('section', { part: 'root', 'data-component': tagName }, slots.default?.() ?? []);
    },
  });

  customElements.define(tagName, Element);
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

  if (!registeredTags.has(tags.engine)) {
    defineEngineElement(tags.engine);
    registeredTags.add(tags.engine);
  }

  const simpleElements = [
    {
      tagName: tags.scene,
      config: {
        props: { sceneId: { type: String, default: 'default' }, active: { type: Boolean, default: true } },
        mountedEvent: 'xr-scene-mounted',
        unmountedEvent: 'xr-scene-unmounted',
      },
    },
    {
      tagName: tags.camera,
      config: {
        props: {
          entityId: { type: String, default: '' },
          fov: { type: Number, default: 60 },
          near: { type: Number, default: 0.1 },
          far: { type: Number, default: 1000 },
          active: { type: Boolean, default: true },
        },
        mountedEvent: 'xr-camera-mounted',
        unmountedEvent: 'xr-camera-unmounted',
      },
    },
    {
      tagName: tags.entity,
      config: {
        props: {
          entityId: { type: String, default: '' },
          parentId: { type: String, default: '' },
          visible: { type: Boolean, default: true },
          selected: { type: Boolean, default: false },
        },
        mountedEvent: 'xr-entity-mounted',
        unmountedEvent: 'xr-entity-unmounted',
      },
    },
    {
      tagName: tags.hud,
      config: {
        props: {
          panelId: { type: String, default: 'hud-main' },
          overlayId: { type: String, default: 'hud-overlay' },
          visible: { type: Boolean, default: true },
        },
        mountedEvent: 'xr-hud-mounted',
        unmountedEvent: 'xr-hud-unmounted',
      },
    },
    {
      tagName: tags.debugPanel,
      config: {
        props: { open: { type: Boolean, default: false }, metricsTarget: { type: String, default: 'runtime' } },
        mountedEvent: 'xr-debug-panel-mounted',
        unmountedEvent: 'xr-debug-panel-unmounted',
      },
    },
    {
      tagName: tags.handDebug,
      config: {
        props: {
          hand: { type: String, default: 'left' },
          showJoints: { type: Boolean, default: true },
          showPinch: { type: Boolean, default: true },
          showPoke: { type: Boolean, default: true },
        },
        mountedEvent: 'xr-hand-debug-mounted',
        unmountedEvent: 'xr-hand-debug-unmounted',
      },
    },
    {
      tagName: tags.inputProfileViewer,
      config: {
        props: {
          profileId: { type: String, default: '' },
          deviceKind: { type: String, default: 'unknown' },
          layout: { type: String, default: 'grid' },
        },
        mountedEvent: 'xr-input-profile-viewer-mounted',
        unmountedEvent: 'xr-input-profile-viewer-unmounted',
      },
    },
  ] as const;

  for (const definition of simpleElements) {
    if (registeredTags.has(definition.tagName)) continue;
    defineSimpleElement(definition.tagName, definition.config);
    registeredTags.add(definition.tagName);
  }
}

export const defaultUIWebComponentTags = defaultTags;
