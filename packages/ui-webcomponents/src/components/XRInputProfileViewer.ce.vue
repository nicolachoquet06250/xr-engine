<template>
  <section part="root" data-component="xr-input-profile-viewer"><slot /></section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-input-profile-viewer-mounted', detail: Record<string, never>): void;
  (event: 'xr-input-profile-viewer-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-input-profile-viewer-mounted', {}));
onUnmounted(() => emit('xr-input-profile-viewer-unmounted', {}));
</script>
