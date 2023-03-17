<template>
  <div class="player-notice" :style="{ opacity }">{{ text }}</div>
</template>

<script setup>
import { ref } from 'vue'

const opacity = ref(0)
const text = ref('')

let timer = null

function notice (textVal, time = 2000, opacityVal = 0.8) {
  text.value = textVal;
  opacity.value = opacityVal;
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (time > 0) {
    timer = setTimeout(() => {
      opacity.value = 0;
    }, time);
  }
}

defineExpose({
  notice
})
</script>

<style lang="scss" scoped>
.player-notice {
  opacity: 0;
  position: absolute;
  bottom: 60px;
  left: 20px;
  font-size: 14px;
  border-radius: 2px;
  background: rgba(28, 28, 28, 0.9);
  padding: 7px 20px;
  transition: all .3s ease-in-out;
  overflow: hidden;
  color: #fff;
  pointer-events: none;
}
</style>
