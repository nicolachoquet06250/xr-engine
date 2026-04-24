<template>
  <section part="root" data-component="xr-hand-debug"><slot /></section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-hand-debug-mounted', detail: Record<string, never>): void;
  (event: 'xr-hand-debug-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-hand-debug-mounted', {}));
onUnmounted(() => emit('xr-hand-debug-unmounted', {}));
</script>
