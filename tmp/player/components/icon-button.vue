<template>
  <button 
    class="player-icon"
    :disabled="disabled"
    :style="{
      opacity: disabled ? 0.4 : 1.0
    }"
    :title="tooltip"
  >
    <span 
      :class="`mdi mdi-${icon} ${spin ? `mdi-spin` : ''} mdi-24px`"
      :style="{ color }"
    ></span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '' },
  color: { type: String },
  disabled: {type: Boolean, default: false},
  inactive: {type: Boolean, default: false},
  spin: {type: Boolean, default: false},
  tooltip: {type: String, default: null}
})

const color = computed(() => {
  if (props.color) {
    return props.color
  } else if (props.inactive) {
    return 'rgba(255, 255, 255, 0.3)'
  } else {
    return 'white'
  }
})
</script>
