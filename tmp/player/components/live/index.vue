<template>
  <n-config-provider :theme="darkTheme">
    <div id="app">
      <div style="flex: 1; display: flex;">
        <div style="flex: 1;">
          <!-- default live video -->
          <LiveMainVideo
            :urn="urn"
            :deviceSwitch="deviceSwitch"
            :multiMode="multiMode"
            :streams="streams"
            :selected="selectedId"
          />
        </div>
        <div v-show="multiMode" :style="{ width: '50%' }">
          <keep-alive>
            <LiveSubVideo
              v-if="multiMode"
              :id="1"
              :streams="streams"
              :selected="multiMode"
            />
          </keep-alive>
        </div>
      </div>

      <div v-show="multiMode" :style="{ height: '50%', display: 'flex' }">
        <div style="flex: 1;">
          <keep-alive>
            <LiveSubVideo
              v-if="multiMode"
              :id="2"
              :streams="streams"
              :selected="multiMode"
            />
          </keep-alive>
        </div>
        <div style="width: 50%;">
          <keep-alive>
            <LiveSubVideo
              v-if="multiMode"
              :id="3"
              :streams="streams"
              :selected="multiMode"
            />
          </keep-alive>
        </div>
      </div>
    </div>
  
    <Notice ref="noticeEl" />
  </n-config-provider>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { NConfigProvider, darkTheme } from 'naive-ui'
import Notice from '../notice'
import LiveMainVideo from './live-main-video-captures'
import LiveSubVideo from './live-sub-video'

const noticeEl = ref(null)

const urn = ref(null)
const deviceSwitch = ref(false)
const streams = ref([])
const username = ref(null)
const password = ref(null)

const selectedId = ref(0)

const multiMode = ref(false)

onMounted(() => {
  parseLocation()
})

function parseLocation () {
  let mainUrl

  if (document.location.protocol === 'rtsp:') {
    mainUrl = document.location.href
  } else {
    const params = (new URL(document.location)).searchParams;
    const requestUrl = params.get('url')

    mainUrl = requestUrl

    if (requestUrl) {
      try {
        const obj = JSON.parse(requestUrl)

        if (obj != null && typeof obj === 'object') {
          mainUrl = obj.url
          urn.value = obj.urn;
          deviceSwitch.value = !!obj.deviceSwitch
          username.value = obj.username;
          password.value = obj.password;

          if (Array.isArray(obj.streams)) {
            const out = []
            for (let id = 0; id < obj.streams.length; id++) {
              const [name, url] = obj.streams[id]
              out.push({ id, name, url })

              if (url === mainUrl) {
                selectedId.value = id
              }
            }
            streams.value = out
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  if (streams.value.length === 0) {
    streams.value = [{ id: 0, name: 'default', url: mainUrl }]
  }
}

function selectStream (id) {
  if (id === 'all') {
    multiMode.value = true
    selectedId.value = 0
  } else {
    multiMode.value = false
    selectedId.value = id
  }
}

provide('selectStream', selectStream)

function notice (text, time = 2000, opacity = 0.8) {
  noticeEl.value.notice(text, time, opacity)
}

provide('notice', notice)
</script>

<style lang="scss">
#app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #000000;
}
</style>
