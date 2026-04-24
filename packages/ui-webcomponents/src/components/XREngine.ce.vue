<template>
  <section part="root" data-component="xr-engine">
    <slot />
  </section>
</template>

<script setup lang="ts">
import { getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue';

import type {
  UIAction,
  UIBridgeSnapshot,
  XREngineDestroyedEventDetail,
  XREngineElement,
  XREngineReadyEventDetail,
  XRRuntimeAttachedEventDetail,
} from '../web-component';

const props = defineProps<{
  route?: string;
  debug?: boolean;
  menuOpen?: boolean;
}>();

const emit = defineEmits<{
  (event: 'xr-engine-ready', detail: XREngineReadyEventDetail): void;
  (event: 'xr-engine-destroyed', detail: XREngineDestroyedEventDetail): void;
  (event: 'xr-ui-snapshot', detail: UIBridgeSnapshot): void;
  (event: 'xr-runtime-attached', detail: XRRuntimeAttachedEventDetail): void;
}>();

const route = ref(props.route ?? '/');
const debug = ref(props.debug ?? false);
const menuOpen = ref(props.menuOpen ?? false);
const runtimeAttached = ref(false);

function getHost(): XREngineElement | null {
  return (getCurrentInstance()?.vnode.el as XREngineElement | null) ?? null;
}

function createSnapshot(): UIBridgeSnapshot {
  return Object.freeze({
    route: route.value,
    focusedId: null,
    visiblePanelIds: Object.freeze([]),
    enabledOverlayIds: Object.freeze([]),
    menuOpen: menuOpen.value,
    debugEnabled: debug.value,
  });
}

function publishSnapshot(): void {
  emit('xr-ui-snapshot', createSnapshot());
}

function dispatchUIAction(action: UIAction): void {
  if (action.type === 'ui.debug.enable') debug.value = true;
  if (action.type === 'ui.debug.disable') debug.value = false;
  if (action.type === 'ui.menu.open') menuOpen.value = true;
  if (action.type === 'ui.menu.close') menuOpen.value = false;
  if (action.type === 'ui.route.set' && typeof action.payload === 'string') route.value = action.payload;
  publishSnapshot();
}

function attachRuntime(runtime: unknown): void {
  const host = getHost();
  if (!host) return;

  host.engine = runtime;
  runtimeAttached.value = true;
  emit('xr-runtime-attached', { runtimeAttached: true });
}

function detachRuntime(): void {
  const host = getHost();
  if (!host || !runtimeAttached.value) return;

  host.engine = undefined;
  runtimeAttached.value = false;
  emit('xr-runtime-attached', { runtimeAttached: false });
}

function getSnapshot(): UIBridgeSnapshot {
  return createSnapshot();
}

watch(
  () => props.route,
  (value) => {
    route.value = value ?? '/';
    publishSnapshot();
  }
);

watch(
  () => props.debug,
  (value) => {
    debug.value = value ?? false;
    publishSnapshot();
  }
);

watch(
  () => props.menuOpen,
  (value) => {
    menuOpen.value = value ?? false;
    publishSnapshot();
  }
);

onMounted(() => {
  emit('xr-engine-ready', {
    route: route.value,
    debugEnabled: debug.value,
  });
  publishSnapshot();
});

onUnmounted(() => {
  emit('xr-engine-destroyed', { route: route.value });
});

defineExpose({
  getSnapshot,
  dispatchUIAction,
  attachRuntime,
  detachRuntime,
});
</script>
