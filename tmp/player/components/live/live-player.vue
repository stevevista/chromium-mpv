<template>
  <x-live
    ref="videoRef"
    :src="src"
    :debug-log="debugLog"
    :profiling="profiling"
    :auto-scale="settings.player.scaleOutput"
    :disable-audio="settings.player.disableAudio"
    :hwaccel="settings.player.hwaccel"
    :transport="settings.player.streamingType"
    :locale="locale"
    :ai-switch="settings.aiSwitchs"
    :screenshot-path="settings.screenshotPath"
    :username="authUsername"
    :password="authPassword"
    :volume="volume"
    :mute="mute"
    :online-detection="localDetection"
    :smart-record="settings.player.smartRecord && !smartRecord"
    show-loading
  ></x-live>

  <InfoPanel 
    v-model:show="showInfoPanel"
    :path="propertites.path"
    :format="propertites.fileFormat"
    :width="propertites.width"
    :height="propertites.height"
    :fps="propertites.fps"
    :drops="propertites.drops"
    :videoc="propertites.videoCodec"
    :audioc="propertites.audioCodec"
  />
</template>

<script setup>
import { ref, computed, reactive, onMounted, inject, watch } from 'vue'
import { provideRtspAuth, gerPreferAuthInfo } from '../../store'
import { useSettings } from '~/renderer/store/common-store'
import { useI18n } from 'vue-i18n'
import InfoPanel from '../info-panel'

const notice = inject('notice')

const emit = defineEmits([
  'detection',
  'profiling',
  'start-file',
  'update:showInfo',
  'update:mute',
  'update:volume',
  'update:fullscreen',
  'update-properties',
])

const props = defineProps({
  urn: String,
  showInfo: { type: Boolean, default: false },
  src: { type: String, default: '' },
  debugLog: String,
  localDetection: { type: Boolean, default: false },
  smartRecord: { type: Boolean, default: false },
  mute: { type: Boolean, default: false },
  volume: { type: Number, default: 100 },
  fullscreen: { type: Boolean, default: false },
  profiling: { type: Boolean, default: false },
})

const showInfoPanel = computed({
  get () {
    return props.showInfo
  },
  set (value) {
    emit('update:showInfo', value)
  }
})

const settings = useSettings()
const { locale } = useI18n()

const videoRef = ref(null)

const authUsername = ref('')
const authPassword = ref('')

watch(() => props.src, (url) => {
  const { username, password } = gerPreferAuthInfo(url)
  authUsername.value = username || ''
  authPassword.value = password || ''
}, {
  immediate: true
})

watch(() => props.fullscreen, (v) => {
  videoRef.value.fullscreen = v
})

const propertites = reactive({
  idle: true,
  fps: 0,
  drops: 0,
  width: 0,
  height: 0,
  fileFormat: '',
  videoCodec: '',
  audioCodec: '',
  path: '',
})

const listenProps = Object.keys(propertites)

onMounted(() => {
  videoRef.value.addEventListener('prop-change', (name, value) => {
    emit('update-properties', name, value)

    if (name === 'mute') {
      emit('update:mute', value)
      return
    }

    if (name === 'volume') {
      emit('update:volume', value)
      return
    }

    if (name === 'fullscreen') {
      emit('update:fullscreen', value)
      return
    }

    if (listenProps.indexOf(name) >= 0) {
      propertites[name] = value
    }
  })

  videoRef.value.addEventListener('start-file', () => {
    onFileStart()
  
    emit('start-file', props.src)
  
    propertites.fps = 0
    propertites.drops = 0

    emit('update-properties', 'unauthed', false)
  })

  videoRef.value.addEventListener('file-loaded', () => {
    onFileLoaded()
  })

  videoRef.value.addEventListener('end-file', () => {
    onFileEnd()
  })

  videoRef.value.addEventListener('auth-require', (url, prevUsername, prevPass, cb) => {
    // cancel auto reconnect
    cancelReconnectTimer()

    emit('update-properties', 'unauthed', true)

    provideRtspAuth({
      url,
      username: prevUsername || '',
      password: prevPass || ''
    }, (result) => {
      cb(result)
      if (result && result.username && result.password) {
        authUsername.value = result.username
        authPassword.value = result.password
      }
    })
  })

  videoRef.value.addEventListener('record-path', (path) => {
    if (path) {
      notice(`Record to ${path}`, 5000)
      emit('update-properties', 'recordPath', path)
    }
  })

  videoRef.value.addEventListener('error-msg', (msg) => {
    notice(msg);
  })

  videoRef.value.addEventListener('screenshot', ({ path, success }) => {
    if (path) {
      notice(`Saving to ${path} ${success ? '' : 'fail'}`, 5000);
    }
  })

  videoRef.value.addEventListener('detection', (ai) => {
    emit('detection', ai)
  })

  videoRef.value.addEventListener('profiling', (data) => {
    emit('profiling', data)
  })

  videoRef.value.addEventListener('first-picture', () => {
    if (props.urn) {
      // delay some tick to wait screen display
      setTimeout(() => window.electron.onvif.captureVideo(props.urn), 100)
    }
  })
})

// play control

// reconnect control
let _userStop = false
let _userReload = false
let _restartTimer = null
let _restartWaits = 500
let _restartCount = 0

function cancelReconnectTimer () {
  if (_restartTimer) {
    clearTimeout(_restartTimer)
    _restartTimer = null
  }
}

function onFileStart () {
  _userStop = false
  _userReload = false
  cancelReconnectTimer()

  console.log('[play start]')
}

function onFileLoaded () {
  _restartWaits = 500
  _restartCount = 0
  console.log('[play loaded]')
}

function onFileEnd () {
  console.log('[play end]')

  if (_userReload) {
    return setTimeout(play, 50)
  }

  if (_userStop || !settings.player.autoReconnect) {
    return
  }

  if (_restartTimer) {
    clearTimeout(_restartTimer)
  }
  _restartTimer = setTimeout(_restart, _restartWaits)
}

function _restart () {
  if (!settings.player.autoReconnect) {
    return
  }

  console.log('[play reconnect] ', _restartCount)

  _restartCount++
  _restartWaits = Math.min(_restartCount, 10) * 1000

  play()
}

function stop () {
  _userStop = true
  videoRef.value?.stop()
}

function reload () {
  _userReload = true
  videoRef.value?.stop()
}

function togglePlay () {
  if (props.src && propertites.idle) {
    play()
  } else if (!propertites.idle) {
    stop()
  }
}

function play () {
  videoRef.value?.play()
}

function playIfIdle () {
  if (props.src && propertites.idle) {
    videoRef.value?.play()
  }
}

function crop (...args) {
  return videoRef.value.crop(...args)
}

function screenshot (...args) {
  return videoRef.value.screenshot(...args)
}

function talk (...args) {
  return videoRef.value.talk(...args)
}

function record (...args) {
  return videoRef.value.record(...args)
}

defineExpose({
  reload,
  playIfIdle,
  togglePlay,
  crop,
  screenshot,
  talk,
  record,
})
</script>
