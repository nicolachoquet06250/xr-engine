<template>
  <slot />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  hand?: 'left' | 'right';
  showJoints?: boolean;
  showPinch?: boolean;
  showPoke?: boolean;
}>();

const emit = defineEmits<{
  (event: 'xr-hand-debug-mounted', detail: { hand: 'left' | 'right' }): void;
  (event: 'xr-hand-debug-unmounted', detail: { hand: 'left' | 'right' }): void;
  (event: 'xr-hand-debug-visibility-changed', detail: {
    hand: 'left' | 'right';
    showJoints: boolean;
    showPinch: boolean;
    showPoke: boolean;
  }): void;
  (event: 'xr-hand-debug-tracking-updated', detail: {
    hand: 'left' | 'right';
    trackingValid: boolean;
    pinchStrength: number;
    pokeDistance: number;
  }): void;
}>();

const hand = ref<'left' | 'right'>(props.hand ?? 'left');
const showJoints = ref(props.showJoints ?? true);
const showPinch = ref(props.showPinch ?? true);
const showPoke = ref(props.showPoke ?? true);
const trackingValid = ref(false);
const pinchStrength = ref(0);
const pokeDistance = ref(0);

function setVisibilityFlags(next: {
  showJoints?: boolean;
  showPinch?: boolean;
  showPoke?: boolean;
}): void {
  if (typeof next.showJoints === 'boolean') showJoints.value = next.showJoints;
  if (typeof next.showPinch === 'boolean') showPinch.value = next.showPinch;
  if (typeof next.showPoke === 'boolean') showPoke.value = next.showPoke;

  emit('xr-hand-debug-visibility-changed', {
    hand: hand.value,
    showJoints: showJoints.value,
    showPinch: showPinch.value,
    showPoke: showPoke.value,
  });
}

function updateTracking(next: {
  trackingValid: boolean;
  pinchStrength: number;
  pokeDistance: number;
}): void {
  trackingValid.value = next.trackingValid;
  pinchStrength.value = next.pinchStrength;
  pokeDistance.value = next.pokeDistance;

  emit('xr-hand-debug-tracking-updated', {
    hand: hand.value,
    trackingValid: trackingValid.value,
    pinchStrength: pinchStrength.value,
    pokeDistance: pokeDistance.value,
  });
}

function getState(): {
  hand: 'left' | 'right';
  showJoints: boolean;
  showPinch: boolean;
  showPoke: boolean;
  trackingValid: boolean;
  pinchStrength: number;
  pokeDistance: number;
} {
  return {
    hand: hand.value,
    showJoints: showJoints.value,
    showPinch: showPinch.value,
    showPoke: showPoke.value,
    trackingValid: trackingValid.value,
    pinchStrength: pinchStrength.value,
    pokeDistance: pokeDistance.value,
  };
}

watch(() => props.hand, (value) => value && (hand.value = value));
watch(
  () => [props.showJoints, props.showPinch, props.showPoke] as const,
  ([nextShowJoints, nextShowPinch, nextShowPoke]) =>
    setVisibilityFlags({
      showJoints: nextShowJoints,
      showPinch: nextShowPinch,
      showPoke: nextShowPoke,
    })
);

onMounted(() => emit('xr-hand-debug-mounted', { hand: hand.value }));
onUnmounted(() => emit('xr-hand-debug-unmounted', { hand: hand.value }));

defineExpose({
  setVisibilityFlags,
  updateTracking,
  getState,
});
</script>
