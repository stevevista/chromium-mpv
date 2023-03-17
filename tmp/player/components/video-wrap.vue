<template>
  <div 
    class="video-wrap" 
    @click.stop="clickScreen"
    :class="{ zooming: !!zoomShape }"
    @mousedown.stop="mousedown"
    @mousemove="mousemove"
    @mouseup="mouseup"
    @mousewheel="mousewheel"
  >
    <slot />
  
    <div class="player-bezel">
      <span class="player-bezel-play-icon" v-bind:class="{'ended-icon' : idle}" v-show="!playing && hasVideo">
        <span :class="`mdi mdi-${idle ? (unauthed ? 'account-lock' : (stream ? 'link-off' : 'replay')) : 'play'} mdi-light mdi-36px`"></span>
      </span>
    </div>

    <div class="player-crop-selection" :style="zoomShapeStyle" />

    <div class="player-status">
      <span class="player-cancel-zoom"
        v-show="zooming"
        @click.stop="emit('zoom-request')"
      >
        <v-icon color="white" dense>mdi-arrow-expand</v-icon>{{ t('video.zoom_reset') }}
      </span>
        <span class="player-speed"
          v-show="playSpeed !== 1.0"
          @click.stop="emit('reset-speed')"
        >
          <v-icon color="white" dense>mdi-fast-forward</v-icon><v-icon color="white">mdi-numeric-{{ playSpeed }}</v-icon>
        </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  unauthed: { type: Boolean, default: false },
  idle: { type: Boolean, default: false },
  stream: { type: Boolean, default: false },
  playing: { type: Boolean, default: false },
  hasVideo: { type: Boolean, default: false },
  zooming: { type: Boolean, default: false },
  playSpeed: { type: Number, default: 1.0 },
})

const zoomingState = ref(0)
const zoomShape = ref()
const zoomStartX = ref(0)
const zoomStartY = ref(0)
const isDrawing = ref(false)

const zoomShapeStyle = computed(() => {
  if (!zoomShape.value) {
    return {
      display: 'none'
    }
  }

  return {
    left: zoomShape.value[0] + 'px',
    top: zoomShape.value[1] + 'px',
    width: (zoomShape.value[2] - zoomShape.value[0]) + 'px',
    height: (zoomShape.value[3] - zoomShape.value[1]) + 'px'
  }
})

watch(() => props.idle, v => {
  if (v) {
    zoomingState.value = 0
    zoomShape.value = undefined
  }
})

const emit = defineEmits(['zoom-request', 'click-screen', 'reset-speed'])

function mousedown (e) {
  if (e.button === 0) {
    e.preventDefault();
    zoomingState.value = 1
    zoomStartX.value = e.offsetX
    zoomStartY.value = e.offsetY
  }
}

function mousemove (e) {
  if (zoomingState.value !== 1) {
    return
  }
  let x = e.offsetX
  let y = e.offsetY
  const x0 = Math.min(zoomStartX.value, x)
  const y0 = Math.min(zoomStartY.value, y)
  const x1 = Math.max(zoomStartX.value, x)
  const y1 = Math.max(zoomStartY.value, y)
      const w = Math.abs(x1 - x0)
      const h = Math.abs(y1 - y0)

      if (w > 10 && h > 10) {
        zoomShape.value = [x0, y0, x1, y1]
      } else {
        zoomShape.value = undefined
      }
}

function mouseup (e) {
  if (e.button === 0) {
    e.preventDefault();
    zoomingState.value = 0
    if (zoomShape.value !== undefined) {
      e.stopPropagation();
      emit('zoom-request', zoomShape.value)
      zoomShape.value = undefined
          isDrawing.value = true
          setTimeout(() => {
            isDrawing.value = false
          }, 300)
          return false
    }
  }
}

function mousewheel (e) {
      if (e.ctrlKey) {
        e.preventDefault();
        const {offsetX, offsetY} = e
        const {offsetWidth, offsetHeight} = e.target
        const x0 = offsetX
        const x1 = offsetWidth - offsetX
        const dx = Math.min(x0, x1)
        const dxx = parseInt(dx / 4)
        const y0 = offsetY
        const y1 = offsetHeight - offsetY
        const dy = Math.min(y0, y1)
        const dyy = parseInt(dy / 4)

        const dx0 = x0 === dx ? dxx : (dxx * (x0 / x1))
        const dx1 = x1 === dx ? dxx : (dxx * (x1 / x0))
        const dy0 = y0 === dy ? dyy : (dyy * (y0 / y1))
        const dy1 = y1 === dy ? dyy : (dyy * (y1 / y0))

    if (e.wheelDelta > 0) {
      const zoomShape = [parseInt(dx0), parseInt(dy0), parseInt(offsetWidth - dx1), parseInt(offsetHeight - dy1)]
      emit('zoom-request', zoomShape)
    } else if (e.wheelDelta < 0) {
      const zoomShape = [-parseInt(dx0), -parseInt(dy0), parseInt(offsetWidth + dx1), parseInt(offsetHeight + dy1)]
      emit('zoom-request', zoomShape)
    } 
  }
}

function clickScreen (e) {
  if (!isDrawing.value) {
    emit('click-screen')
  }
}
</script>

<style lang="scss" scoped>
.zooming {
  cursor: crosshair;
}

.video-wrap {
  height: 100%;
  position: relative;
  font-size: 0;

  .player-bezel {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    font-size: 22px;
    color: #fff;
    pointer-events: none;

    .player-bezel-play-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        margin: -30px 0 0 -30px;
        height: 60px;
        width: 60px;
        padding: 13px;
        box-sizing: border-box;
        background: rgba(255, 255, 255, .1);
        border-radius: 50%;
        pointer-events: none;
        &.ended-icon {
          background: rgba(0, 0, 0, 0.7);
        }
    }
  }

  .player-crop-selection {
    position: absolute;
    border-color: #fff;
    border:3px dashed;
    pointer-events:none;
    color: #fff;
  }

  .player-status {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 12px;
    span {
      border-radius: 2px;
      padding: 4px 6px;
      color: #fff;
      border:1px dashed;
      transition: all .3s ease-in-out;
      overflow: hidden;
    }
    .player-speed {
      background-color: rgba(255, 0, 0, 0.3);
    }
    .player-cancel-zoom {
      background-color: rgba(128, 0, 128, 0.3);
    }
  }
}
</style>
