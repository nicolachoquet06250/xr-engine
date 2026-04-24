<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  panelId?: string;
  overlayId?: string;
  visible?: boolean;
  anchor?: 'screen' | 'world';
}>();

const emit = defineEmits<{
  (event: 'xr-hud-mounted', detail: { panelId: string; overlayId: string; visible: boolean }): void;
  (event: 'xr-hud-unmounted', detail: { panelId: string; overlayId: string }): void;
  (event: 'xr-hud-visibility-changed', detail: { panelId: string; visible: boolean }): void;
  (event: 'xr-hud-anchor-changed', detail: { panelId: string; anchor: 'screen' | 'world' }): void;
}>();

const panelId = ref(props.panelId ?? 'hud-main');
const overlayId = ref(props.overlayId ?? 'hud-overlay');
const visible = ref(props.visible ?? true);
const anchor = ref<'screen' | 'world'>(props.anchor ?? 'screen');

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

function getState(): { panelId: string; overlayId: string; visible: boolean; anchor: 'screen' | 'world' } {
  return {
    panelId: panelId.value,
    overlayId: overlayId.value,
    visible: visible.value,
    anchor: anchor.value,
  };
}

watch(() => props.panelId, (value) => typeof value === 'string' && (panelId.value = value));
watch(() => props.overlayId, (value) => typeof value === 'string' && (overlayId.value = value));
watch(() => props.visible, (value) => typeof value === 'boolean' && (value ? show() : hide()));
watch(() => props.anchor, (value) => value && setAnchor(value));

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
