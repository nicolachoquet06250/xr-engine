<template>
  <slot />
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, toRefs, watch} from 'vue';

const {entityId, parentId, visible, selected, enabled} = toRefs(withDefaults(defineProps<{
  entityId?: string;
  parentId?: string|null;
  visible?: boolean;
  selected?: boolean;
  enabled?: boolean;
}>(), {
  entityId: '',
  parentId: null,
  visible: true,
  selected: false,
  enabled: true,
}));

const emit = defineEmits<{
  (event: 'xr-entity-mounted', detail: { entityId: string; parentId: string | null }): void;
  (event: 'xr-entity-unmounted', detail: { entityId: string }): void;
  (event: 'xr-entity-visibility-changed', detail: { entityId: string; visible: boolean }): void;
  (event: 'xr-entity-selection-changed', detail: { entityId: string; selected: boolean }): void;
  (event: 'xr-entity-enabled-changed', detail: { entityId: string; enabled: boolean }): void;
  (event: 'xr-entity-parent-changed', detail: { entityId: string; parentId: string | null }): void;
}>();

function setVisible(nextVisible: boolean): void {
  visible.value = nextVisible;
  emit('xr-entity-visibility-changed', { entityId: entityId.value, visible: nextVisible });
}

function setSelected(nextSelected: boolean): void {
  selected.value = nextSelected;
  emit('xr-entity-selection-changed', { entityId: entityId.value, selected: nextSelected });
}

function setEnabled(nextEnabled: boolean): void {
  enabled.value = nextEnabled;
  emit('xr-entity-enabled-changed', { entityId: entityId.value, enabled: nextEnabled });
}

function setParent(nextParentId: string | null): void {
  parentId.value = nextParentId;
  emit('xr-entity-parent-changed', { entityId: entityId.value, parentId: nextParentId });
}

function getState(): {
  entityId: string;
  parentId: string | null;
  visible: boolean;
  selected: boolean;
  enabled: boolean;
} {
  return {
    entityId: entityId.value,
    parentId: parentId.value,
    visible: visible.value,
    selected: selected.value,
    enabled: enabled.value,
  };
}

watch(entityId, (value) => entityId.value = value);
watch(parentId, (value) => setParent(value ?? null));
watch(visible, (value) => setVisible(value));
watch(selected, (value) => setSelected(value));
watch(enabled, (value) => setEnabled(value));

onMounted(() => {
  emit('xr-entity-mounted', {
    entityId: entityId.value,
    parentId: parentId.value,
  });
});

onUnmounted(() => {
  emit('xr-entity-unmounted', { entityId: entityId.value });
});

defineExpose({
  setVisible,
  setSelected,
  setEnabled,
  setParent,
  getState,
});
</script>
