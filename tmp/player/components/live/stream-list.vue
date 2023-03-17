<template>
  <div class="menu-buttons">
    <icon-button
      :disabled="disabled"
      :icon="`numeric-${selected + 1}-box`"
      :tooltip="streams[selected]?.name"
    />
    <icon-button
      v-for="s in unselectedStreams"
      :key="s.id"
      :disabled="disabled"
      :icon="`numeric-${s.id + 1}-box`"
      @click="selectStream(s.id)"
      :tooltip="s.name"
    />
    <icon-button
      key="view"
      :disabled="disabled"
      icon="grid-large"
      @click="selectStream('all')"
      tooltip="view"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import IconButton from '../icon-button'

const selectStream = inject('selectStream')

const props = defineProps({
  streams: Array,
  selected: Number,
  disabled: {type: Boolean, default: false}
})

const unselectedStreams = computed(() => props.streams.filter(s => s.id !== props.selected))
</script>
