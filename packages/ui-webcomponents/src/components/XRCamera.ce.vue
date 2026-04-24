<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, toRefs, withDefaults } from 'vue';

const props = withDefaults(
  defineProps<{
    entityId?: string;
    active?: boolean;
    fov?: number;
    near?: number;
    far?: number;
  }>(),
  {
    entityId: '',
    active: true,
    fov: 60,
    near: 0.1,
    far: 1000,
  }
);
const { entityId, active, fov, near, far } = toRefs(props);

const emit = defineEmits<{
  (event: 'xr-camera-mounted', detail: { entityId: string; active: boolean }): void;
  (event: 'xr-camera-unmounted', detail: { entityId: string }): void;
  (event: 'xr-camera-activity-changed', detail: { entityId: string; active: boolean }): void;
  (event: 'xr-camera-projection-changed', detail: { fov: number; near: number; far: number }): void;
  (event: 'xr-camera-entity-bound', detail: { entityId: string }): void;
}>();

function bindToEntity(nextEntityId: string): void {
  entityId.value = nextEntityId;
  emit('xr-camera-entity-bound', { entityId: nextEntityId });
}

function setActive(nextActive: boolean): void {
  active.value = nextActive;
  emit('xr-camera-activity-changed', { entityId: entityId.value, active: nextActive });
}

function setProjection(nextFov: number, nextNear: number, nextFar: number): void {
  fov.value = nextFov;
  near.value = nextNear;
  far.value = nextFar;
  emit('xr-camera-projection-changed', { fov: nextFov, near: nextNear, far: nextFar });
}

function getState(): { entityId: string; active: boolean; fov: number; near: number; far: number } {
  return {
    entityId: entityId.value,
    active: active.value,
    fov: fov.value,
    near: near.value,
    far: far.value,
  };
}

watch(entityId, (value) => bindToEntity(value));
watch(active, (value) => setActive(value));
watch([fov, near, far] as const, ([nextFov, nextNear, nextFar]) =>
  setProjection(nextFov ?? 60, nextNear ?? 0.1, nextFar ?? 1000)
);

onMounted(() => {
  emit('xr-camera-mounted', { entityId: entityId.value, active: active.value });
});

onUnmounted(() => {
  emit('xr-camera-unmounted', { entityId: entityId.value });
});

defineExpose({
  bindToEntity,
  setActive,
  setProjection,
  getState,
});
</script>
