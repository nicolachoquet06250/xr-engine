<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  entityId?: string;
  parentId?: string;
  visible?: boolean;
  selected?: boolean;
  enabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'xr-entity-mounted', detail: { entityId: string; parentId: string | null }): void;
  (event: 'xr-entity-unmounted', detail: { entityId: string }): void;
  (event: 'xr-entity-visibility-changed', detail: { entityId: string; visible: boolean }): void;
  (event: 'xr-entity-selection-changed', detail: { entityId: string; selected: boolean }): void;
  (event: 'xr-entity-enabled-changed', detail: { entityId: string; enabled: boolean }): void;
  (event: 'xr-entity-parent-changed', detail: { entityId: string; parentId: string | null }): void;
}>();

const entityId = ref(props.entityId ?? '');
const parentId = ref<string | null>(props.parentId ?? null);
const visible = ref(props.visible ?? true);
const selected = ref(props.selected ?? false);
const enabled = ref(props.enabled ?? true);

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

watch(() => props.entityId, (value) => typeof value === 'string' && (entityId.value = value));
watch(() => props.parentId, (value) => setParent(value ?? null));
watch(() => props.visible, (value) => typeof value === 'boolean' && setVisible(value));
watch(() => props.selected, (value) => typeof value === 'boolean' && setSelected(value));
watch(() => props.enabled, (value) => typeof value === 'boolean' && setEnabled(value));

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
