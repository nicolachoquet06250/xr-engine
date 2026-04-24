<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, toRefs, watch, withDefaults } from 'vue';

const props = withDefaults(
  defineProps<{
    profileId?: string;
    deviceKind?: string;
    layout?: 'grid' | 'list';
    activeControl?: string | null;
  }>(),
  {
    profileId: '',
    deviceKind: 'unknown',
    layout: 'grid',
    activeControl: null,
  }
);
const { profileId, deviceKind, layout, activeControl } = toRefs(props);

const emit = defineEmits<{
  (
    event: 'xr-input-profile-viewer-mounted',
    detail: { profileId: string; deviceKind: string }
  ): void;
  (event: 'xr-input-profile-viewer-unmounted', detail: { profileId: string }): void;
  (
    event: 'xr-input-profile-viewer-profile-changed',
    detail: { profileId: string; deviceKind: string }
  ): void;
  (event: 'xr-input-profile-viewer-layout-changed', detail: { layout: 'grid' | 'list' }): void;
  (event: 'xr-input-profile-viewer-control-focused', detail: { controlId: string | null }): void;
}>();

function setProfile(nextProfileId: string, nextDeviceKind: string): void {
  profileId.value = nextProfileId;
  deviceKind.value = nextDeviceKind;
  emit('xr-input-profile-viewer-profile-changed', {
    profileId: nextProfileId,
    deviceKind: nextDeviceKind,
  });
}

function setLayout(nextLayout: 'grid' | 'list'): void {
  layout.value = nextLayout;
  emit('xr-input-profile-viewer-layout-changed', { layout: nextLayout });
}

function focusControl(controlId: string | null): void {
  activeControl.value = controlId;
  emit('xr-input-profile-viewer-control-focused', { controlId });
}

function reset(): void {
  activeControl.value = null;
  layout.value = 'grid';
  emit('xr-input-profile-viewer-control-focused', { controlId: null });
  emit('xr-input-profile-viewer-layout-changed', { layout: 'grid' });
}

function getState(): {
  profileId: string;
  deviceKind: string;
  layout: 'grid' | 'list';
  activeControl: string | null;
} {
  return {
    profileId: profileId.value,
    deviceKind: deviceKind.value,
    layout: layout.value,
    activeControl: activeControl.value,
  };
}

watch(profileId, (value) => setProfile(value, deviceKind.value));
watch(deviceKind, (value) => setProfile(profileId.value, value));
watch(layout, (value) => value && setLayout(value));
watch(activeControl, (value) => focusControl(value ?? null));

onMounted(() => {
  emit('xr-input-profile-viewer-mounted', {
    profileId: profileId.value,
    deviceKind: deviceKind.value,
  });
});

onUnmounted(() => {
  emit('xr-input-profile-viewer-unmounted', { profileId: profileId.value });
});

defineExpose({
  setProfile,
  setLayout,
  focusControl,
  reset,
  getState,
});
</script>
