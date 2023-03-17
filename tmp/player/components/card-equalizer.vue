<template>
  <div>
    <v-row class="pr-2">
      <v-col :cols="4">
        <span class="white--text">Brightness: </span>
      </v-col>
      <v-col :cols="8">
        <n-slider v-model:value="brightnessVal" :step="1" :min="-100" :max="100" />
      </v-col>
    </v-row>

    <v-row class="pr-2">
      <v-col :cols="4">
        <span class="white--text">Contrast: </span>
      </v-col>
      <v-col :cols="8">
        <n-slider v-model:value="contrastVal" :step="1" :min="-100" :max="100" />
      </v-col>
    </v-row>

    <v-row class="pr-2">
      <v-col :cols="4">
        <span class="white--text">Gamma: </span>
      </v-col>
      <v-col :cols="8">
        <n-slider v-model:value="gammaVal" :step="1" :min="-100" :max="100" />
      </v-col>
    </v-row>

    <v-row class="pr-2">
      <v-col :cols="4">
        <span class="white--text">Saturation: </span>
      </v-col>
      <v-col :cols="8">
        <n-slider v-model:value="saturationVal" :step="1" :min="-100" :max="100" />
      </v-col>
    </v-row>

    <v-row class="pr-2">
      <v-col :cols="4">
        <span class="white--text">Hue: </span>
      </v-col>
      <v-col :cols="8">
        <n-slider v-model:value="hueVal" :step="1" :min="-100" :max="100" />
      </v-col>
    </v-row>

    <v-row class="pr-2">
      <v-col :cols="4">
        <span class="white--text">Colormatrix</span>
      </v-col>
      <v-col :cols="8">
        <n-radio-group v-model:value="primaryVal">
          <n-space>
            <n-radio value="auto">Auto</n-radio>
            <n-radio value="bt.601-625">BT.601</n-radio>
            <n-radio value="bt.709">BT.709</n-radio>
          </n-space>
        </n-radio-group>
      </v-col>
    </v-row>
  </div>

  <n-button type="tertiary" @click="resetEqualizer">
    Reset
  </n-button>

</template>

<script setup>
import { computed } from 'vue'
import { NButton, NSpace, NRadioGroup, NRadio, NSlider } from 'naive-ui'
import {
  VRow,
  VCol,
} from 'vuetify/components'

const props = defineProps({
  player: Object,
  contrast: { type: Number, default: 0 },
  brightness: { type: Number, default: 0 },
  gamma: { type: Number, default: 0 },
  saturation: { type: Number, default: 0 },
  hue: { type: Number, default: 0 },
  primary: { type: String, default: 'auto' },
})

const emit = defineEmits([
  'update:contrast',
  'update:brightness',
  'update:gamma',
  'update:saturation',
  'update:hue',
  'update:primary',
])

const contrastVal = computed({
  get () {
    return props.contrast
  },
  set (value) {
    props.player.property('contrast', value)
    emit('update:contrast', value)
  }
})

const brightnessVal = computed({
  get () {
    return props.brightness
  },
  set (value) {
    props.player.property('brightness', value)
    emit('update:brightness', value)
  }
})

const gammaVal = computed({
  get () {
    return props.gamma
  },
  set (value) {
    props.player.property('gamma', value)
    emit('update:gamma', value)
  }
})

const saturationVal = computed({
  get () {
    return props.saturation
  },
  set (value) {
    props.player.property('saturation', value)
    emit('update:saturation', value)
  }
})

const hueVal = computed({
  get () {
    return props.hue
  },
  set (value) {
    props.player.property('hue', value)
    emit('update:hue', value)
  }
})

const primaryVal = computed({
  get () {
    return props.primary
  },
  set (value) {
    props.player.option('target-prim', value)
    emit('update:primary', value)
  }
})

function resetEqualizer () {
  contrastVal.value = 0
  brightnessVal.value = 0
  gammaVal.value = 0
  saturationVal.value = 0
  hueVal.value = 0
  primaryVal.value = 'auto'
}
</script>
