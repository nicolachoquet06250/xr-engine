<template>
  <section part="root" data-component="xr-entity"><slot /></section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (event: 'xr-entity-mounted', detail: Record<string, never>): void;
  (event: 'xr-entity-unmounted', detail: Record<string, never>): void;
}>();

onMounted(() => emit('xr-entity-mounted', {}));
onUnmounted(() => emit('xr-entity-unmounted', {}));
</script>
