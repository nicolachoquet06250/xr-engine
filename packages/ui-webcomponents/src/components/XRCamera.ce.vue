<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  entityId?: string;
  active?: boolean;
  fov?: number;
  near?: number;
  far?: number;
}>();

const emit = defineEmits<{
  (event: 'xr-camera-mounted', detail: { entityId: string; active: boolean }): void;
  (event: 'xr-camera-unmounted', detail: { entityId: string }): void;
  (event: 'xr-camera-activity-changed', detail: { entityId: string; active: boolean }): void;
  (event: 'xr-camera-projection-changed', detail: { fov: number; near: number; far: number }): void;
  (event: 'xr-camera-entity-bound', detail: { entityId: string }): void;
}>();

const entityId = ref(props.entityId ?? '');
const active = ref(props.active ?? true);
const fov = ref(props.fov ?? 60);
const near = ref(props.near ?? 0.1);
const far = ref(props.far ?? 1000);

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

watch(() => props.entityId, (value) => typeof value === 'string' && bindToEntity(value));
watch(() => props.active, (value) => typeof value === 'boolean' && setActive(value));
watch(
  () => [props.fov, props.near, props.far] as const,
  ([nextFov, nextNear, nextFar]) =>
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
