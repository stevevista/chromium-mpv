<template>
  <div class="player-bottom-controller" @contextmenu.stop v-resize="onResize">
    <!-- left -->
    <div class="player-icons player-icons-left">
      <div class="menu-buttons" v-show="showOpen">
        <icon-button
          icon="folder-open"
          @click="emit('open-files')"/>
        <icon-button
          icon="file-multiple"
          @click="emit('open-dir')"
          :tooltip="t('video.openDir')"/>
        <icon-button
          icon="link-variant"
          @click="emit('open-stream')"
          :tooltip="t('video.openUrl')"/>
      </div>
      <icon-button
        v-show="barWidth > 400 && showPlay && !isScrcpy"
        :icon="idle ? 'replay' : (pause ? 'play' : 'pause')"
        :disabled="!playlist.length"
        @click="() => player.toggle_play(true)"/>
      <icon-button
        v-show="barWidth > 500 && showPlay && !isLive"
        icon="arrow-left-bold-box"
        @click="() => player.prev_frame()"
          :tooltip="t('prev_frame')"
          :disabled="!showPlay || !playlist.length || idle"
        />
      <icon-button
        v-show="barWidth > 500 && showPlay && !isLive"
        icon="arrow-right-bold-box"
        @click="() => player.next_frame()"
        :tooltip="t('next_frame')"
        :disabled="!showPlay || !playlist.length || idle"
      />
      <icon-button
        v-show="barWidth > 500 && showPlay && !isLive"
        :icon="repeatIcon"
        @click="circleRepeat"
        :tooltip="t('video.' + repeatIcon)"
      />
      <VolumeControl
        v-show="!isScrcpy"
        v-model:mute="muteVal"
        v-model:volume="volumeVal"
      />
      <span class="player-time">
        {{ formattedTimePos }} / {{ formattedDuration }}
      </span>
    </div>

    <div class="spacer"></div>
    <!-- right -->
    <div class="player-icons player-icons-right">
      <icon-button
        v-show="barWidth > 400"
        icon="information-outline"
        :tooltip="t('video.info')"
        @click="showInfoVal=!showInfoVal"/>
      <n-popover trigger="hover">
        <template #trigger>
      <icon-button
        v-show="barWidth > 500"
        icon="invert-colors"
        :tooltip="t('equalizer')"
      />
    </template>
      <slot name="equalizer"></slot>
    
      </n-popover>
      <LocalDetectionSwitch v-model="localDetectionOn" v-show="!isScrcpy" />
      <AISwitch 
        v-show="barWidth > 400 && !isScrcpy"
      />
      <GroupScreenshot
        v-show="barWidth > 400"
        :disabled="idle"
        :working="snapshotting"
        @screenshot="emit('screenshot')"
        @screenshot-multi="emit('multi-screenshot')"
        @screenshot-stop="emit('multi-screenshot')"
      />
      <icon-button
        :icon="fullscreen ? 'fullscreen-exit' : 'crop-free'"
        @click="() => player.property('fullscreen', !fullscreen)"
        :tooltip="t('video.Full_screen')"/>
    </div>
    <!-- play bar -->
    <div class="player-bar-wrap"
      ref="playedBarWrapEl"
      v-show="!isLive && !isScrcpy"
      @mouseleave="showTimeAnchor=false"
      @mouseenter="showTimeAnchor=true"
      @mousemove="mousemove"
      @mousedown="mousedown"
    >
      <div class="player-bar-time" :class="{ hidden: duration <= 0 || !showTimeAnchor }">00:00</div>
      <div class="player-bar-preview"></div>
      <div class="player-bar">
        <div class="player-played" :style="`width: ${playedPercentage*100}%`">
          <span class="player-thumb" :style="`background: #b7daff`"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable no-template-curly-in-string */
/**
  * optimize control play progress

  * optimize get element's view position,for float dialog video player
  */
import { ref, watch, computed, onMounted } from 'vue'
import IconButton from './icon-button'
import AISwitch from './ai-switch'
import LocalDetectionSwitch from './local-detection-switch'
import GroupScreenshot from './group-screenshot'
import VolumeControl from './volume-control'
import { formatSeconds } from './utils'
import { useI18n } from 'vue-i18n'
import VResize from '~/common/resize-directive'
import { NPopover } from 'naive-ui'

const { t } = useI18n()

const emit = defineEmits([
  'open-files',
  'open-dir', 
  'open-stream', 
  'update:mute',
  'update:volume',
  'update:show-info',
  'screenshot',
  'multi-screenshot',
  'update:localDetection'])

const showTimeAnchor = ref(false)

function getBoundingClientRectViewLeft (element) {
  const scrollTop = window.scrollY || window.pageYOffset || document.body.scrollTop + ((document.documentElement && document.documentElement.scrollTop) || 0);

  if (element.getBoundingClientRect) {
    if (typeof getBoundingClientRectViewLeft.offset !== 'number') {
      let temp = document.createElement('div');
      temp.style.cssText = 'position:absolute;top:0;left:0;';
      document.body.appendChild(temp);
      getBoundingClientRectViewLeft.offset = -temp.getBoundingClientRect().top - scrollTop;
      document.body.removeChild(temp);
      temp = null;
    }
    const rect = element.getBoundingClientRect();
    const offset = getBoundingClientRectViewLeft.offset;

    return rect.left + offset;
  } else {
    // not support getBoundingClientRect
    return getElementViewLeft(element);
  }
}

/**
 * control play progress
 */
// get element's view position
function getElementViewLeft (element) {
  let actualLeft = element.offsetLeft;
  let current = element.offsetParent;
  const elementScrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
    while (current !== null) {
      actualLeft += current.offsetLeft;
      current = current.offsetParent;
    }
  } else {
    while (current !== null && current !== element) {
      actualLeft += current.offsetLeft;
      current = current.offsetParent;
    }
  }
  return actualLeft - elementScrollLeft;
}

const props = defineProps({
  player: Object,
  showOpen: {default: false, type: Boolean},
  showPlay: {default: false, type: Boolean},
  snapshotting: {default: false, type: Boolean},
  idle: {default: true, type: Boolean},
  pause: {default: true, type: Boolean},
  playlist: {type: Array, default: () => []},
  timePos: { default: 0, type: Number },
  duration: {default: 0, type: Number},
  fullscreen: {default: false, type: Boolean},
  isLive: { default: false, type: Boolean },
  isScrcpy: { default: false, type: Boolean },
  mute: {type: Boolean, default: false},
  volume: {type: Number, default: 100},
  localDetection: { type: Boolean, default: false },
  showInfo: { default: false, type: Boolean },
})

const playedBarWrapEl = ref(null)

const repeat = ref(0)
const timePosCalc = ref(0)

const showInfoVal = computed({
  get () {
    return props.showInfo
  },
  set (value) {
    emit('update:show-info', value)
  }
})

const muteVal = computed({
  get () {
    return props.mute
  },
  set (value) {
    emit('update:mute', value)
  }
})

const volumeVal = computed({
  get () {
    return props.volume
  },
  set (value) {
    emit('update:volume', value)
  }
})

const repeatIcon = computed(() => {
  if (repeat.value === 1) {
    return 'repeat-once'
  } else if (repeat.value === 2) {
    return 'repeat'
  } else if (repeat.value === 3) {
    return 'playlist-music'
  } else {
    return 'repeat-off'
  }
})

const localDetectionOn = computed({
  get () {
    return props.localDetection
  },
   
  set (value) {
    emit('update:localDetection', value)
  }
})

watch(() => props.timePos, v => {
  timePosCalc.value = v
})

const duration_fix_delta = 2
const duration_fix_thres = 15

const playedPercentage = computed(() => props.duration > 0 ? (timePosCalc.value + (props.duration > duration_fix_thres ? duration_fix_delta : 0) >= props.duration ? 1 : timePosCalc.value / props.duration) : 0)
const formattedTimePos = computed(() => formatSeconds(timePosCalc.value))
const formattedDuration = computed(() => formatSeconds(props.duration))

let playedBarTimeEl = null

const barWidth = ref(0)

function onResize (e, { width }) {
  barWidth.value = width
}

onMounted(() => {
  timePosCalc.value = props.timePos
  playedBarTimeEl = playedBarWrapEl.value.querySelector('.player-bar-time');
})

function calcMouseTimePercentage (e) {
  let percentage = ((e.clientX || e.changedTouches[0].clientX) - getBoundingClientRectViewLeft(playedBarWrapEl.value)) / playedBarWrapEl.value.clientWidth;
  percentage = Math.max(percentage, 0)
  percentage = Math.min(percentage, 1)
  return percentage
}

function thumbMove (e) {
  if (props.duration > 0) {
    timePosCalc.value = calcMouseTimePercentage(e) * props.duration
  }
}

function thumbUp (e) {
  document.removeEventListener('mouseup', thumbUp);
  document.removeEventListener('mousemove', thumbMove);
  props.player.seekPercent(calcMouseTimePercentage(e) * 100)
}

function mousedown (e) {
  if (props.idle) {
    return
  }
  document.addEventListener('mousemove', thumbMove);
  document.addEventListener('mouseup', thumbUp);
}

function mousemove (e) {
  if (props.duration > 0) {
    const px = e.target.getBoundingClientRect().left;
    const tx = (e.clientX || e.changedTouches[0].clientX) - px;
    if (tx < 0 || tx > e.target.offsetWidth) {
      return;
    }
    const time = props.duration * (tx / e.target.offsetWidth);
    playedBarTimeEl.style.left = `${tx - (time >= 3600 ? 25 : 20)}px`;
    playedBarTimeEl.innerText = formatSeconds(time);
    showTimeAnchor.value = true
  }
}

function circleRepeat () {
  if (repeat.value >= 2) {
    repeat.value = 0;
  } else {
    repeat.value++;
  }
  if (repeat.value === 0) {
    props.player.option('loop-file', 'no');
    props.player.option('loop-playlist', 'no');
  } else if (repeat.value === 1) {
    props.player.option('loop-file', 'inf');
  } else if (repeat.value === 2) {
    props.player.option('loop-file', 'no');
    props.player.option('loop-playlist', 'inf');
  }
}
</script>

<style lang="scss" scoped>

.spacer {
  flex: auto;
  pointer-events: none;
}

.player-bottom-controller {
  display: flex;
  flex-direction: row;
  pointer-events: none;

  .player-icons {
    pointer-events: all;

    &.player-icons-left {
      .player-icon {
        padding: 0px;
      }
    }
    &.player-icons-right {
      right: 20px;
      .player-icon {
        padding: 0px;
      }
    }

    .player-icon {
      width: 40px;
      height: 100%;
      border: none;
      background-color: transparent;
      outline: none;
      cursor: pointer;
      vertical-align: middle;
      box-sizing: border-box;
      .player-icon-content {
          transition: all .2s ease-in-out;
          opacity: .8;
      }
      &:hover {
          .player-icon-content {
              opacity: 1;
          }
      }
      &.player-setting-icon {
        padding-top: 8.5px;
      }
    }

    .player-time {
      line-height: 38px;
      color: #eee;
      text-shadow: 0 0 2px rgba(0, 0, 0, .5);
      vertical-align: middle;
      font-size: 13px;
      cursor: default;
    }
  }

  .player-bar-wrap {
    padding: 15px 0;
    cursor: pointer;
    position: absolute;
    bottom: 33px;
    width: calc(100% - 40px);
    height: 3px;
    pointer-events: all;
    &:hover {
      .player-bar .player-played .player-thumb {
        transform: scale(1);
      }
    }
    .player-bar-preview {
            position: absolute;
            background: #fff;
            pointer-events: none;
            display: none;
            background-size: 16000px 100%;
    }
    .player-bar-preview-canvas {
            position: absolute;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: none;
    }
    .player-bar-time {
            &.hidden {
                opacity: 0;
            }
            position: absolute;
            left: 0px;
            top: -20px;
            border-radius: 4px;
            padding: 5px 7px;
            background-color: rgba(0, 0, 0, 0.62);
            color: #fff;
            font-size: 12px;
            text-align: center;
            opacity: 1;
            transition: opacity .1s ease-in-out;
            word-wrap: normal;
            word-break: normal;
            z-index: 2;
            pointer-events: none;
    }
    .player-bar {
      position: relative;
      height: 3px;
      width: 100%;
      background: rgba(255, 255, 255, .2);
      cursor: pointer;
      .player-played {
              background: #b7daff;
              position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                height: 3px;
                will-change: width;
                .player-thumb {
                    position: absolute;
                    top: 0;
                    right: 5px;
                    margin-top: -4px;
                    margin-right: -10px;
                    height: 11px;
                    width: 11px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all .3s ease-in-out;
                    transform: scale(0);
                }
      }
    }
  }
}
</style>
