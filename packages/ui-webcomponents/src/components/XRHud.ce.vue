<template>
  <section part="root" data-component="xr-hud"><slot /></section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-hud-mounted', detail: Record<string, never>): void;
  (event: 'xr-hud-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-hud-mounted', {}));
onUnmounted(() => emit('xr-hud-unmounted', {}));
</script>
