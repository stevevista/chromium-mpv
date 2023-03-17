<template>
  <icon-button
    :title="t(switched ? 'trace_on' : 'trace_off')"
    :color="switched ? '#cf6679' : 'grey'"
    :icon="switched ? 'eye' : 'eye-off-outline'"
    @click="switched=!switched" 
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconButton from './icon-button'

const { t } = useI18n()

const emit =  defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const switched = computed({
  get () {
    return props.modelValue
  },
   
  set (value) {
    emit('update:modelValue', value)
  }
})

</script>
