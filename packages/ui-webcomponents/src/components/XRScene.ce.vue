<template>
  <section part="root" data-component="xr-scene"><slot /></section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-scene-mounted', detail: Record<string, never>): void;
  (event: 'xr-scene-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-scene-mounted', {}));
onUnmounted(() => emit('xr-scene-unmounted', {}));
</script>
