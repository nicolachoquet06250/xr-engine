<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, withDefaults } from 'vue';

const props = withDefaults(
  defineProps<{
    panelId?: string;
    overlayId?: string;
    visible?: boolean;
    anchor?: 'screen' | 'world';
  }>(),
  {
    panelId: 'hud-main',
    overlayId: 'hud-overlay',
    visible: true,
    anchor: 'screen',
  }
);
const panelId = ref(props.panelId);
const overlayId = ref(props.overlayId);
const visible = ref(props.visible);
const anchor = ref(props.anchor);

const emit = defineEmits<{
  (event: 'xr-hud-mounted', detail: { panelId: string; overlayId: string; visible: boolean }): void;
  (event: 'xr-hud-unmounted', detail: { panelId: string; overlayId: string }): void;
  (event: 'xr-hud-visibility-changed', detail: { panelId: string; visible: boolean }): void;
  (event: 'xr-hud-anchor-changed', detail: { panelId: string; anchor: 'screen' | 'world' }): void;
}>();

function show(): void {
  visible.value = true;
  emit('xr-hud-visibility-changed', { panelId: panelId.value, visible: true });
}

function hide(): void {
  visible.value = false;
  emit('xr-hud-visibility-changed', { panelId: panelId.value, visible: false });
}

function toggle(): boolean {
  visible.value = !visible.value;
  emit('xr-hud-visibility-changed', { panelId: panelId.value, visible: visible.value });
  return visible.value;
}

function setAnchor(nextAnchor: 'screen' | 'world'): void {
  anchor.value = nextAnchor;
  emit('xr-hud-anchor-changed', { panelId: panelId.value, anchor: nextAnchor });
}

function getState(): {
  panelId: string;
  overlayId: string;
  visible: boolean;
  anchor: 'screen' | 'world';
} {
  return {
    panelId: panelId.value,
    overlayId: overlayId.value,
    visible: visible.value,
    anchor: anchor.value,
  };
}

watch(
  () => props.panelId,
  (value) => {
    if (!value) return;
    panelId.value = value;
  }
);

watch(
  () => props.overlayId,
  (value) => {
    if (!value) return;
    overlayId.value = value;
  }
);

watch(
  () => props.visible,
  (value) => {
    if (value === undefined || value === visible.value) return;
    value ? show() : hide();
  }
);

watch(
  () => props.anchor,
  (value) => {
    if (!value || value === anchor.value) return;
    setAnchor(value);
  }
);

onMounted(() => {
  emit('xr-hud-mounted', {
    panelId: panelId.value,
    overlayId: overlayId.value,
    visible: visible.value,
  });
});

onUnmounted(() => {
  emit('xr-hud-unmounted', {
    panelId: panelId.value,
    overlayId: overlayId.value,
  });
});

defineExpose({
  show,
  hide,
  toggle,
  setAnchor,
  getState,
});
</script>
