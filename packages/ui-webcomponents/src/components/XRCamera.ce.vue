<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-camera-mounted', detail: Record<string, never>): void;
  (event: 'xr-camera-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-camera-mounted', {}));
onUnmounted(() => emit('xr-camera-unmounted', {}));
</script>
