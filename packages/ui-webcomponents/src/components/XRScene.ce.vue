<template>
  <slot />
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, toRefs, watch} from 'vue';

const {sceneId, active, loaded} = toRefs(withDefaults(defineProps<{
  sceneId?: string;
  active?: boolean;
  loaded?: boolean;
}>(), {
  sceneId: 'default',
  active: true,
  loaded: false,
}));

const emit = defineEmits<{
  (event: 'xr-scene-mounted', detail: { sceneId: string; active: boolean; loaded: boolean }): void;
  (event: 'xr-scene-unmounted', detail: { sceneId: string }): void;
  (event: 'xr-scene-activity-changed', detail: { sceneId: string; active: boolean }): void;
  (event: 'xr-scene-loaded-changed', detail: { sceneId: string; loaded: boolean }): void;
  (event: 'xr-scene-id-changed', detail: { previousSceneId: string; sceneId: string }): void;
}>();

function publishActivity(): void {
  emit('xr-scene-activity-changed', { sceneId: sceneId.value, active: active.value });
}

function publishLoaded(): void {
  emit('xr-scene-loaded-changed', { sceneId: sceneId.value, loaded: loaded.value });
}

function setSceneId(nextSceneId: string): void {
  const previousSceneId = sceneId.value;
  sceneId.value = nextSceneId;
  emit('xr-scene-id-changed', { previousSceneId, sceneId: nextSceneId });
}

function setActive(nextActive: boolean): void {
  active.value = nextActive;
  publishActivity();
}

function setLoaded(nextLoaded: boolean): void {
  loaded.value = nextLoaded;
  publishLoaded();
}

function getState(): { sceneId: string; active: boolean; loaded: boolean } {
  return {
    sceneId: sceneId.value,
    active: active.value,
    loaded: loaded.value,
  };
}

watch(sceneId, (value) => value && setSceneId(value));
watch(active, (value) => setActive(value));
watch(loaded, (value) => setLoaded(value));

onMounted(() => {
  emit('xr-scene-mounted', {
    sceneId: sceneId.value,
    active: active.value,
    loaded: loaded.value,
  });
});

onUnmounted(() => {
  emit('xr-scene-unmounted', { sceneId: sceneId.value });
});

defineExpose({
  setSceneId,
  setActive,
  setLoaded,
  getState,
});
</script>
