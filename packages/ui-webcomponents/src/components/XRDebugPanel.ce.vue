<template>
  <section part="root" data-component="xr-debug-panel"><slot /></section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-debug-panel-mounted', detail: Record<string, never>): void;
  (event: 'xr-debug-panel-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-debug-panel-mounted', {}));
onUnmounted(() => emit('xr-debug-panel-unmounted', {}));
</script>
