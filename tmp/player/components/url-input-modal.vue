<template>
  <n-modal v-model:show="showVal">
    <n-card
      style="width: 70%"
      :bordered="false"
      role="dialog"
      aria-modal="true"
      content-style="padding: 0;"
    >
      <n-input-group>
        <n-input 
          v-model:value="inputVal"
          @keydown.enter.stop.prevent="emit('input', inputVal)"
          :placeholder="placeholder">
        </n-input>
        <n-button text :style="{ paddingLeft: '10px', paddingRight: '10px' }" @click="emit('input', inputVal)">
          <span class="mdi mdi-arrow-right-thick mdi-24px"></span>
        </n-button>
      </n-input-group>
    </n-card>
  </n-modal>
</template>

<script setup>
import { computed } from 'vue'
import { NInput, NInputGroup, NModal, NCard, NButton } from 'naive-ui'

const props = defineProps({
  show: { type: Boolean, default: false },
  value: { type: String, default: '' },
  placeholder: { type: String, default: 'rtsp://' },
})

const emit = defineEmits(['update:show', 'update:value', 'input'])

const showVal = computed({
  get () {
    return props.show
  },
  set (value) {
    emit('update:show', value)
  }
})

const inputVal = computed({
  get () {
    return props.value
  },
  set (value) {
    emit('update:value', value)
  }
})
</script>
