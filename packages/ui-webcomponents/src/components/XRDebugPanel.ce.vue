<template>
  <slot />
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, toRefs, watch} from 'vue';

const {open, metricsTarget, refreshRate} = toRefs(withDefaults(defineProps<{
  open?: boolean;
  metricsTarget?: string;
  refreshRate?: number;
}>(), {
  open: false,
  metricsTarget: 'runtime',
  refreshRate: 15,
}));

const emit = defineEmits<{
  (event: 'xr-debug-panel-mounted', detail: { open: boolean; metricsTarget: string }): void;
  (event: 'xr-debug-panel-unmounted', detail: { metricsTarget: string }): void;
  (event: 'xr-debug-panel-open-changed', detail: { open: boolean }): void;
  (event: 'xr-debug-panel-target-changed', detail: { metricsTarget: string }): void;
}>();

function openPanel(): void {
  open.value = true;
  emit('xr-debug-panel-open-changed', { open: true });
}

function closePanel(): void {
  open.value = false;
  emit('xr-debug-panel-open-changed', { open: false });
}

function toggle(): boolean {
  open.value = !open.value;
  emit('xr-debug-panel-open-changed', { open: open.value });
  return open.value;
}

function setMetricsTarget(nextMetricsTarget: string): void {
  metricsTarget.value = nextMetricsTarget;
  emit('xr-debug-panel-target-changed', { metricsTarget: nextMetricsTarget });
}

function getState(): { open: boolean; metricsTarget: string; refreshRate: number } {
  return {
    open: open.value,
    metricsTarget: metricsTarget.value,
    refreshRate: refreshRate.value,
  };
}

watch(open, (value) => value ? openPanel() : closePanel());
watch(metricsTarget, (value) => setMetricsTarget(value));
watch(refreshRate, (value) => refreshRate.value = value);

onMounted(() => {
  emit('xr-debug-panel-mounted', {
    open: open.value,
    metricsTarget: metricsTarget.value,
  });
});

onUnmounted(() => {
  emit('xr-debug-panel-unmounted', {
    metricsTarget: metricsTarget.value,
  });
});

defineExpose({
  openPanel,
  closePanel,
  toggle,
  setMetricsTarget,
  getState,
});
</script>
