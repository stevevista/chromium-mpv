<template>
  <n-config-provider :theme="darkTheme">
  <v-app theme="dark">
    <div id="app" class="player-container"
      @contextmenu.stop.prevent="contextmenu" 
      @drop.stop="dropFile"
      @dragover.prevent
    >
      <VideoWrap
        @click-screen="clickPlay"
        @zoom-request="s => player.crop(s)"
        @reset-speed="toggleSpeed(1)"
        :zooming="propertites.zooming"
        :playSpeed="propertites.speed"
        :idle="idle"
        :unauthed="propertites.unauthed"
        :stream="isLive"
        :playing="isPlaying"
        :hasVideo="!!propertites.playlist.length"
      >
        <x-player ref="player"
          :debug-log="debugLogPath"
          :hwaccel="settings.player.hwaccel"
          :locale="locale"
          :ai-switch="settings.aiSwitchs"
          :online-detection="localDetection && !isScrcpy"
          :screenshot-path="settings.screenshotPath"
          :screenshot-format="settings.screenshotFormat"
          :transport="settings.player.streamingType"
          :video-sync="settings.player.syncType"
          :disable-audio="settings.player.disableAudio"
          :volume="propertites.volume"
          :mute="propertites.mute"
          show-loading
        >
        </x-player>
      </VideoWrap>
      <FFController
        :player="player"
        :showOpen="showOpen"
        :showPlay="showPlay"
        :idle="idle"
        :pause="propertites.pause"
        :playlist="propertites.playlist"
        :snapshotting="propertites.screenshotting"
        :timePos="propertites['time-pos']"
        :duration="propertites.duration"
        :isLive="isLive"
        :isScrcpy="isScrcpy"
        v-model:mute="propertites.mute"
        v-model:volume="propertites.volume"
        v-model:local-detection="localDetection"
        v-model:show-info="showInfoPanel"
        @open-files="openFiles"
        @open-stream="toggleAddress"
        @open-dir="openDir"
        @screenshot="doSreenshot"
        @multi-screenshot="doMultiSreenshot">
        <template #equalizer>
          <CardEqualizer
            :player="player"
            v-model:contrast="contrast"
            v-model:brightness="brightness"
            v-model:gamma="gamma"
            v-model:saturation="saturation"
            v-model:hue="hue"
            v-model:primary="primary"
          />
        </template>
      </FFController>

      <PlayList
        :player="player"
        :playlist="propertites.playlist"
        v-show="showPlayList"
        :is-show-arrow="isShowArrow"
        @add-items="addNewItems"/>

      <InfoPanel 
        v-model:show="showInfoPanel"
        :hwdec="hwdec"
        :sync="settings.player.syncType"
      />
    </div>

    <Notice ref="noticeEl" />

    <input type="file" ref="openFileEl" style="opacity: 0; position: absolute;" accept="video/*,.ps,.mkv" multiple>
    <input type="file" ref="openDirEl" style="opacity: 0; position: absolute;" accept="video/*,.ps,.mkv" webkitdirectory multiple>

    <!-- dialogs -->
    <n-modal v-model:show="showGotoTimepos">
      <div :min-height="200" color="rgba(0, 0, 0, 0.7)">
        <n-time-picker 
          :default-formatted-value="defaultFormatTime"
          @confirm="confirmTimePos"
          :actions="['confirm']"
          :hours="showHours"
          :minutes="showMinutes"
          :seconds="showSeconds"
        />
      </div>
    </n-modal>

    <n-modal v-model:show="showGotoFrame">
      <div :min-height="200" color="rgba(0, 0, 0, 0.7)">
        <n-input-number 
          v-model:value="targetFrameId" 
        />
        <n-button
          type="primary"
          @click="doGotoTimePos"
        >
          {{ t('video.goto') }} [{{ t('video.frame_id') }}:  {{ `  0 - ${propertites['estimated-frame-count']}` }}]
        </n-button>
      </div>
    </n-modal>

    <UrlInputModal 
      v-model:show="dialogAddress" 
      v-model:value="streamingUri"
      placeholder="(adb|ws|rtsp)://"
      @input="onAddressInput"
    />
  </v-app>
  </n-config-provider>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, onMounted, provide } from 'vue'
import FFController from './controller'
import InfoPanel from './info-panel'
import PlayList from './play-list'
import CardEqualizer from './card-equalizer'
import VideoWrap from './video-wrap'
import { useMenuBuilder } from '~/common/menu-builder/renderer'
import { useSettings } from '~/renderer/store/common-store'
import { useI18n } from 'vue-i18n'
import { provideRtspAuth, ensureScreenshotDirectoryExists } from '../store'
import { NConfigProvider, darkTheme, NInputNumber, NModal, NTimePicker, NButton } from 'naive-ui'
import Notice from './notice'
import UrlInputModal from './url-input-modal'
import { formatSeconds } from './utils'

const allowedExtensions = ['mp4', 'ogg', 'mkv', 'avi', 'mov', 'wmv', '3gp', 'flv', 'f4v', 'h264', 'ps', 'mpeg']

function isAllowedFilename (filename) {
  const flieArr = filename.split('.')
  const suffix = flieArr[flieArr.length - 1];
  return allowedExtensions.indexOf(suffix) >= 0
}

async function traverseFileTree (allowAny, item, out, counts) {
  if (item.isFile) {
    // Get file
    await new Promise(resolve => {
      item.file(function (f) {
        if (allowAny || isAllowedFilename(f.name)) {
          out.push(f.path)
        }
        resolve()
      });
    })
    return 1
  } else if (item.isDirectory) {
    // Get folder contents
    const dirReader = item.createReader();
    await new Promise(resolve => {
      dirReader.readEntries(async (entries) => {
        for (let i = 0; i < entries.length; i++) {
          counts += await traverseFileTree(false, entries[i], out, counts);
          if (counts >= 100) {
            break
          }
        }
        resolve()
      });
    })
    return 0
  }
  return 0
}

const settings = useSettings()
const { t, locale } = useI18n()

const localDetection = ref(false)

watch(locale, v => {
  window.document.title = t('player')
})

const player = ref(null)
const openFileEl = ref(null)
const openDirEl = ref(null)
const noticeEl = ref(null)

const dialogAddress = ref(false)
const streamingUri = ref('')
const showOpen = ref(true)
const showPlay = ref(true)
const showPlayList = ref(true)
const showInfoPanel = ref(false)
const isShowArrow = ref(true)
const url = ref(null)

const showGotoTimepos = ref(false)
const showGotoFrame = ref(false)
const targetFrameId = ref(0)

const contrast = ref(0)
const brightness = ref(0)
const gamma = ref(0)
const saturation = ref(0)
const hue = ref(0)
const primary = ref('auto')

const propertites = reactive({
  fullscreen: false,
  zooming: false,
  screenshotting: false,
  'idle-active': true,
  pause: false,
  'video-codec': '',
  'audio-codec-name': '',
  'file-size': 0,
  'file-format': '',
  filename: '',
  path: '',
  playlist: [],
  'track-list': [],
  'estimated-vf-fps': 0,
  'time-pos': 0,
  duration: -1,
  'estimated-frame-count': 0,
  drops: 0,
  unauthed: false,
  width: 0,
  height: 0,
  speed: 1.0,
  mute: false,
  volume: 100,
})

const isScrcpy = computed(() => propertites['file-format'] === 'scrcpy' && !propertites['idle-active'])
const isLive = computed(() => propertites['file-format'] === 'rtsp' || propertites['file-format'] === 'scrcpy')
const isPlaying = computed(() => !propertites.pause && !idle.value)

const debugLogPath = computed(() => {
  return settings.player.debug
        ? (settings.userDataPath + '/logs/nivm-player-%t.log') : ''
})

watch(dialogAddress, v => {
  player.value.enableKeys(!v)
})

watch(showGotoTimepos, v => {
  player.value.enableKeys(!v)
})

watch(localDetection, v => {
  for (const t of propertites['track-list']) {
    if (v) {
      if (t.codec === 'eia_608') {
        if (!t.selected) {
          player.value.option('sid', t.id)
        }
        break
      }
    } else {
      // user cancelled local-detection
      // set default ai sid back (if presents)
      if (t.codec === 'ass_ai') {
        if (!t.selected) {
          player.value.option('sid', t.id)
        }
        break
      }
    }
  }
})

watch(() => propertites.path, v => {
  const xaddr = new URL(v)
  if (xaddr && xaddr.host) {
    if (xaddr.protocol === 'ws:' || xaddr.protocol === 'wss:') {
      window.document.title = `Websocket [${xaddr.host}]`;
    } else {
      window.document.title = `RTSP [${xaddr.host}]`;
    }
  } else {
    if (v) {
      // dos local file
      const group = v.split('\\');
      window.document.title = group.pop();
    } else {
      window.document.title = t('player');
    }
  }
})

let menuVisible = false
let openContextAppend = false

const menuBuilder = useMenuBuilder(() => {
  setTimeout(() => {
    menuVisible = false
  }, 400)
})

onMounted(() => {
  player.value.addEventListener('start-file', (e) => {
    // reset
    propertites['video-codec'] = ''
    propertites['audio-codec-name'] = ''
    propertites['file-size'] = 0
    propertites.unauthed = false
    propertites['estimated-vf-fps'] = 0
    propertites.drops = 0
  })

  player.value.addEventListener('auth-require', (url, user, pass, cb) => {
    propertites.unauthed = true

    provideRtspAuth({
        url,
        username: user,
        password: pass
      }, ({username, password}) => {
        if (username && password) {
          cb({username, password})
        } else {
          cb({cancel: true})
        }
      })
  })

  player.value.addEventListener('prop-change', (name, value) => {
    if (name === 'volume' || name === 'mute') {
      // prevent looping
      return
    }

    propertites[name] = value
  })

  player.value.addEventListener('scrcpy-control', () => {
    // enable control client
  })

  openFileEl.value.addEventListener('change', (e) => {
    const files = []
    for (const f of openFileEl.value.files) {
      files.push(f.path)
    }
    // reset value so next change will trigger
    openFileEl.value.value = ''

    if (files.length) {
      player.value.load(files, openContextAppend ? 'append' : 'replace');
    }

    // focus to window
    // so to enable key bindings
    window.electron.focusView()
  });

  openDirEl.value.addEventListener('change', (e) => {
    let files = []
    for (const f of openDirEl.value.files) {
      if (isAllowedFilename(f.name)) {
        files.push(f.path)
      }
    }
    // reset value so next change will trigger
    openDirEl.value.value = ''
  
    files = files.slice(0, 100)
    if (files.length) {
      player.value.load(files, openContextAppend ? 'append' : 'replace');
    }

    // focus to window
    // so to enable key bindings
    window.electron.focusView()
  });

  parseLocation()

  if (url.value) {
    streamingUri.value = url.value
    player.value.load(streamingUri.value, 'replace')
  }
})

onBeforeUnmount(() => {
  menuBuilder.dispose()
})

function notice (text, time = 2000, opacity = 0.8) {
  noticeEl.value.notice(text, time, opacity)
}

provide('notice', notice)

function toggleAddress () {
  dialogAddress.value = true
}

function onAddressInput (value) {
  if (value) {
    player.value.load(value, 'replace')
  }
  dialogAddress.value = false
}

function gotoTimePos () {
  showGotoTimepos.value = true
}

function gotoFrame () {
  showGotoFrame.value = true
}

const defaultFormatTime = ref('00:00:00')

watch(showGotoTimepos, v => {
  if (v) {
    defaultFormatTime.value = formatSeconds(propertites['time-pos'], true)
  }
})


const showHours = computed(() => {
  if (propertites.duration >= 3600) {
    const range = []
    const max = Math.ceil(propertites.duration / 3600)
    for (let i = 0; i < max; i++) {
      range.push(i)
    }
    return range
  } else {
    return [0]
  }
})

const showMinutes = computed(() => {
  if (propertites.duration >= 3600) {
    return undefined
  } else if (propertites.duration < 60) {
    return [0]
  } else {
    const range = []
    const max = Math.ceil(propertites.duration / 60)
    for (let i = 0; i < max; i++) {
      range.push(i)
    }
    return range
  }
})

const showSeconds = computed(() => {
  if (propertites.duration >= 60) {
    return undefined
  } else {
    const range = []
    const max = Math.floor(propertites.duration)
    for (let i = 0; i <= max; i++) {
      range.push(i)
    }
    return range
  }
})

function confirmTimePos (value) {
  const t = new Date()
  t.setHours(0)
  t.setMinutes(0)
  t.setSeconds(0)
  t.setMilliseconds(0)
  
  let target = (value - t.getTime()) /1000
  if (target >= propertites.duration) {
    target = Math.floor(propertites.duration)
  }
  player.value.seek(target, 'absolute')
}

function doGotoTimePos () {
  player.value.seekPercent(targetFrameId.value * 100 / propertites['estimated-frame-count']);
  showGotoFrame.value = false
}

function parseLocation () {
  if (document.location.protocol === 'rtsp:') {
    showOpen.value = false
    showPlay.value = false
    showPlayList.value = false
    url.value = document.location.href
  } else {
    let params = (new URL(document.location)).searchParams;
    const requestUrl = params.get('url')

    if (params.has('live')) {
      showOpen.value = false
      showPlay.value = false
      showPlayList.value = false
    }

    if (requestUrl) {
      try {
        const obj = JSON.parse(requestUrl)
        if (obj) {
          url.value = obj.url;
        }
      } catch (e) {
        url.value = requestUrl
      }
    }
  }
}

function contextmenu (e) {
  if (isScrcpy.value) {
    return
  }

  menuBuilder.popup([
    ...(propertites.zooming ? [
      {
        label: t('video.zoom_reset'),
        click: () => {
          player.value.crop(undefined)
        }
      },
      {
        type: 'separator'
      }
    ] : []),
    ...(showOpen.value ? [
          {
            label: t('open'),
            submenu: [
              {
                label: t('common.openFile'),
                click: () => {
                  openFiles()
                }
              },
              {
                label: t('video.openDir'),
                click: () => {
                  openDir()
                }
              },
              {
                label: t('video.openUrl'),
                click: () => {
                  toggleAddress()
                }
              }
            ]
          },
          {
            type: 'separator'
          }
        ] : []),
        ...(showPlay.value ? [
          {
            label: isPlaying.value ? t('common.suspend') : t('common.play'),
            enabled: !!propertites.playlist.length,
            click: () => {
              toggle()
            }
          },
          {
            label: t('video.stop'),
            enabled: !idle.value,
            click: () => {
              player.value.stop()
            }
          },
          {
            type: 'separator'
          },
          {
            label: t('video.goto_timepos'),
            enabled: !idle.value && !isLive.value && propertites.duration > 0,
            click: () => {
              gotoTimePos()
            }
          },
          {
            label: t('video.goto_frame'),
            enabled: !idle.value && !isLive.value && !!propertites['estimated-frame-count'],
            click: () => {
              gotoFrame()
            }
          },
          {
            type: 'separator'
          },
          {
            label: `${t('video.speed')} X 2`,
            enabled: !idle.value,
            args: [2],
            checked: propertites.speed === 2,
            type: 'checkbox',
            click: () => {
              toggleSpeed(2)
            }
          },
          {
            label: `${t('video.speed')} X 4`,
            enabled: !idle.value,
            args: [4],
            checked: propertites.speed === 4,
            type: 'checkbox',
            click: () => {
              toggleSpeed(4)
            }
          },
          {
            type: 'separator'
          }
        ] : [])
      ])
      menuVisible = true
}

function clickPlay (e) {
  // prevent click to pause screencast
  if (isScrcpy.value) {
    return
  }

  // do nothing
  if (menuVisible) {
    menuVisible = false
    return
  }

  toggle();
}

async function doSreenshot () {
  if (!await ensureScreenshotDirectoryExists()) {
    return
  }
  screenshot(false)
}

async function doMultiSreenshot () {
  if (!await ensureScreenshotDirectoryExists()) {
    return
  }
  screenshot(true);
}

async function openDir (append) {
  openContextAppend = append
  openDirEl.value.click()
}

async function openFiles (append) {
  openContextAppend = append
  openFileEl.value.click()
}

async function addNewItems (dropItems) {
  if (dropItems) {
        // from drop
        let files = []
        const items = dropItems;
        for (var i = 0; i < items.length; i++) {
          // webkitGetAsEntry is where the magic happens
          var item = items[i].webkitGetAsEntry();
          if (item) {
            await traverseFileTree(items.length === 1, item, files, 0);
          }
        }

        if (files.length) {
          player.value.load(files, 'append');
        }
  } else {
    openFiles(true)
  }
}

async function dropFile (e) {
      let files = []
      const items = e.dataTransfer.items;
      for (var i = 0; i < items.length; i++) {
        // webkitGetAsEntry is where the magic happens
        var item = items[i].webkitGetAsEntry();
        if (item) {
          await traverseFileTree(items.length === 1, item, files, 0);
        }
      }

      if (files.length) {
        player.value.load(files);
      }
}

function screenshot (each) {
  player.value.screenshot({each, subtitles: settings.screenshotWithAI})
}

function toggle () {
  player.value.toggle_play(true)
}

function toggleSpeed (rate) {
  player.value.property('speed', propertites.speed === rate ? 1.0 : rate)
}
</script>

<style lang="scss" scoped>

// To hide scroll bar, apply this class to <body>
.player-web-fullscreen-fix {
    position: fixed;
    top: 0;
    left: 0;
    margin: 0;
    padding: 0;
}
</style>
