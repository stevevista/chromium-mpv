<template>
  <div class="player-container"
    @contextmenu.stop.prevent="contextmenu"
  >
    <VideoWrap
      @click-screen="() => playerRef.playIfIdle()"
      @zoom-request="s => playerRef.crop(s)"
      :zooming="propertites.zooming"
      :idle="propertites.idle"
      :unauthed="propertites.unauthed"
      :playing="!propertites.idle"
      :hasVideo="!!playUrl"
      stream
    >
      <!-- :debug-log="debugLogPath" -->
      <LivePlayer
        ref="playerRef"
        :urn="urn"
        :src="playUrl"
        :local-detection="localDetection"
        smart-record
        :profiling="settings.player.profiling"
        v-model:show-info="showInfoPanel"
        v-model:mute="mute"
        v-model:volume="volume"
        v-model:fullscreen="fullscreen"
        @update-properties="onUpdateProperties"
        @start-file="onPlayStart"
        @detection="ai => emit('onDetection', ai)"
        @profiling="data => onProfiling(data)"
      />
    </VideoWrap>
    
    <!-- controller bar -->
    <SubVideoControls 
      v-if="multiMode"
      :id="0"
      :streams="streams"
      v-model:show-info="showInfoPanel"
      v-model:fullscreen="fullscreen"
      :timePos="propertites.timePos"
    />

    <div 
      v-else
      class="player-bottom-controller"
      @contextmenu.stop
      :style= "{
        backgroundColor: 'rgba(0, 0, 0, .3)'
      }"
    >
      <!-- left -->
      <div class="player-icons player-icons-left">
        <icon-button
          icon="link-variant"
          @click="toggleUrlInput"
          :tooltip="t('video.openUrl')"
        />
        <icon-button
          :icon="propertites.idle ? 'play' : 'stop'"
          :disabled="!playUrl"
          @click="() => playerRef.togglePlay()"
          :tooltip="t(propertites.idle ? 'common.play' : 'video.stop')"
        />
        <StreamList 
          v-if="streams.length > 1"
          :streams="streams"
          :selected="selected"
        />
        <VolumeControl
          v-model:mute="mute"
          v-model:volume="volume"
        />

        <span class="player-time">{{ formattedTimePos }}</span>
      </div>

      <!-- right -->
      <div class="player-icons player-icons-right">
        <n-badge
          :value="hybirdButtonBadges"
          v-show="showHybirdButton"
        >
          <icon-button
            icon="image-area-close"
            :tooltip="t('video.hybird')"
            @click="() => emit('toggleHybird')"
          />
        </n-badge>

        <icon-button
          icon="information-outline"
          :tooltip="t('video.info')"
          @click="showInfoPanel = !showInfoPanel"
        />

        <icon-button
          v-if="settings.player.profiling"
          icon="lightbulb-on-outline"
          color="#FF9800"
          @click="showProfiling = !showProfiling"
        />
  
        <icon-button
          :icon="propertites.recording ? 'record-rec' : 'record-circle-outline'"
          :color="propertites.recording ? '#cf6679' : 'grey'"
          :title="propertites.recording ? `${t('record')} - ${propertites.recordPath}` : t('record')"
          @click="toggleRecord"
        />
        <icon-button
          v-if="!!urn"
          :icon="propertites.talking ? 'microphone' : 'microphone-off'"
          :color="propertites.talking ? '#cf6679' : 'grey'"
          :title="t('talk')"
          @click="toggleTalk"
        />
        
        <LocalDetectionSwitch v-model="localDetection" />
          
        <AISwitch :urn="urn" :deviceSwitch="deviceSwitch" v-on:ai-configured="onAIReconfigured" />
          
        <GroupScreenshot
          scheduler
          :disabled="propertites.idle"
          :working="propertites.screenshotting"
          @screenshot="screenshot({})"
          @screenshot-multi="screenshot({multiple: true})"
          @screenshot-stop="screenshot({cancel: true})"
        />

        <icon-button
          :icon="fullscreen ? 'fullscreen-exit' : 'crop-free'"
          @click="fullscreen = !fullscreen"
          :tooltip="t('video.Full_screen')"
        />
      </div>
    </div>
    <!-- bar end -->

    <UrlInputModal 
      v-model:show="showUrlInput" 
      v-model:value="inputVal"
      placeholder="(ws|rtsp)://"
      @input="onAddressInput"
    />

    <ProfilingPanel
      v-show="showProfiling" 
      :profilings="profilings"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject, watch } from 'vue'
import IconButton from '../icon-button'
import AISwitch from '../ai-switch'
import LocalDetectionSwitch from '../local-detection-switch'
import GroupScreenshot from '../group-screenshot'
import StreamList from './stream-list'
import VolumeControl from '../volume-control'
import VideoWrap from '../video-wrap'
import { formatSeconds } from '../utils'
import { ensureScreenshotDirectoryExists } from '../../store'
import { useSettings } from '~/renderer/store/common-store'
import { useI18n } from 'vue-i18n'
import LivePlayer from './live-player'
import SubVideoControls from './sub-video-controls'
import UrlInputModal from '../url-input-modal'
import ProfilingPanel from './profiling-panel'
import { NBadge } from 'naive-ui'

const notice = inject('notice')

const emit = defineEmits(['toggleHybird', 'onDetection', 'onPlayStart'])

const props = defineProps({
  urn: String,
  deviceSwitch: { type: Boolean, default: false },
  multiMode: Boolean,
  streams: Array,
  selected: Number,
  showHybirdButton: { type: Boolean, default: true },
  hybirdButtonBadges: { type: Number, default: 0 },
})

const settings = useSettings()
const { t } = useI18n()

const playerRef = ref(null)

const useCustom = ref(false)
const customUrl = ref('')

watch(() => props.selected, () => {
  useCustom.value = false
})

const playUrl = computed(() => (!props.multiMode && useCustom.value && customUrl.value) || props.streams[props.selected]?.url)

const localDetection = ref(false)
const showInfoPanel = ref(false)
const showUrlInput = ref(false)
const showProfiling = ref(false)
const inputVal = ref('')

// player properties
const mute = ref(false)
const volume = ref(100)
const fullscreen = ref(false)

const propertites = reactive({
  timePos: 0,
  fullscreen: false,
  zooming: false,
  idle: true,
  unauthed: false,
  talking: false,
  recording: false,
  screenshotting: false,
  recordPath: '',
})

function onUpdateProperties (name, value) {
  propertites[name] = value
}

const formattedTimePos = computed(() => {
  return formatSeconds(propertites.timePos)
})

const debugLogPath = computed(() => {
  return settings.player.debug
        ? settings.userDataPath + '/logs/nivm-player-%t.log' : ''
})

function toggleUrlInput () {
  inputVal.value = playUrl.value
  showUrlInput.value = true
}

function onAddressInput (value) {
  useCustom.value = true
  customUrl.value = value
  showUrlInput.value = false;
}

onMounted(() => {
  installHotKeys();
})

function onPlayStart (url) {
  localDetection.value = false

  emit('onPlayStart', url)
}

function contextmenu (e) {
  playerRef.value.crop(undefined)
}

    // receiver (format, data) -> bool
async function screenshot (args = {}) {
  if (propertites.screenshotting) {
    playerRef.value.screenshot(false)
    return
  }

  // ensure directory exists
  if (!await ensureScreenshotDirectoryExists()) {
    return
  }
  const format = settings.screenshotFormat
  const scheduleType = args.multiple ? settings.screenshotIntervalType : null;
  const detection = settings.screenshotWithAI
  const maxCount = parseInt(settings.screenshotMaxCount)
  const interval = scheduleType === 'time' ? parseInt(settings.screenshotIntervalTime) : parseInt(settings.screenshotIntervalFrame)
  playerRef.value.screenshot({ format, detection, maxCount, interval, scheduleType, ...args })
}

function toggleTalk () {
  playerRef.value.talk({cancel: propertites.talking, encoding: 'g711a', sampleRate: 8000, bitRate: 64000});
}

async function toggleRecord () {
  if (propertites.recording) {
    playerRef.value.record(false)
  } else {
    if (!await ensureScreenshotDirectoryExists()) {
      return
    }
    playerRef.value.record({})
  }
}

function installHotKeys () {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName.toUpperCase();
    const editable = document.activeElement.getAttribute('contenteditable');
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && editable !== '' && editable !== 'true') {
      const event = e || window.event;
      switch (event.key) {
        case 's':
          event.preventDefault();
          screenshot();
          break;
        case 'h':
          event.preventDefault();
          emit('toggleHybird')
          break;
      }
    }
  });
}

function onAIReconfigured () {
  playerRef.value.reload();
  notice(t('ai_cfg_reconnect'), 8000);
}

const profilings = ref([])

function onProfiling (data) {
  if (data.tick === 0 &&  data.tag === 0) {
    profilings.value.splice(0, profilings.value.length)
  }
  profilings.value.push(data)
}

/*
const PROFILING_START_CONNECT = 0
const PROFILING_CONNECTED = 1
const PROFILING_CHANNEL_SETUP = 2
const PROFILING_FIRST_PACKET_RECV = 3
const PROFILING_PACKET_READ = 4
const PROFILING_VIDEO_PACKET_READ = 5
const PROFILING_FIRST_PIC_DECODED = 6
const PROFILING_SEND = 7
const PROFILING_RSP = 8

function onProfiling ({ tick, tag, arg0, arg1, text }) {
  const time = '[' + tick.toString().padStart(6, 0) + ']'
  switch (tag) {
    case PROFILING_START_CONNECT:
      console.log(`${time} start`)
      break
    case PROFILING_CONNECTED:
      console.log(`${time} connected`)
      break
    case PROFILING_CHANNEL_SETUP:
      console.log(`${time} tracks created`)
      break
    case PROFILING_FIRST_PACKET_RECV:
      console.log(`${time} received first packet`)
      break
    case PROFILING_PACKET_READ:
      {
        let type
        switch (arg1) {
          case 0: 
            type = 'audio'
            break
          case 1:
            type = 'ai'
            break
          default:
            type = `other (idx: ${arg0})`
            break
        }
        console.log(`${time} received ${type} packet`)
      }
      break
    case PROFILING_VIDEO_PACKET_READ:
      console.log(`${time} received VIDEO packet`)
      break
    case PROFILING_FIRST_PIC_DECODED:
      console.log(`${time} first VIDEO frame decoded`)
      break
    case PROFILING_SEND:
      console.log(`${time} >> ${text}`)
      break
    case PROFILING_RSP:
      console.log(`${time} << ${text}`)
      break
  }
}
*/
</script>
