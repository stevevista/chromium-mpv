<template>
  <div style="display: flex; flex-direction: column; height: 100%;">
    <!-- row 1 -->
    <div style="flex: 1; display: flex;">
      <!-- default live video -->
      <LiveMainVideo
        style="flex: 1;"
        v-bind="props"
        :hybirdButtonBadges="cropImageCount"
        :showHybirdButton="recentThumbnails.length > 0"
        @toggleHybird="toggleHybird"
        @onDetection="onDetection"
        @onPlayStart="onPlayStart"
      />

      <!-- recent thumnails -->
      <div style="background-color: #000000; width: 150px;" v-show="hybird && !multiMode">
        <div 
          v-for="(item, index) in curThumbnails"
          :key="index"
          :style="`background-size: contain; height: 150px; background-image: url(${item.src})`"
          class="ma-1">
        </div>
      </div>
    </div>

    <!-- row 2 -->
    <div class="hybird-bottom" v-show="hybird && !multiMode">
      <transition-group name="list" tag="p">
        <div 
          v-for="item in filteredThumbnails"
          :key="item.key"
          class="ma-1 list-item thumbnail-block"
        >
          <img style="object-fit: contain; height: 100%;" :src="item.src"/>
          <div style="position: absolute; top: 0;" v-html="item.html"></div>
        </div>
      </transition-group>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettings } from '~/renderer/store/common-store'
import { useI18n } from 'vue-i18n'
import LiveMainVideo from './live-main-video'

const props = defineProps({
  urn: String,
  deviceSwitch: { type: Boolean, default: false },
  multiMode: Boolean,
  streams: Array,
  selected: Number,
})

const settings = useSettings()
const { t, locale } = useI18n()

const hybird = ref(false)
const curThumbnails = ref([])
const recentThumbnails = ref([])
      
// recentThumbnails: [{
//   html: `<img src='${ICON_MALE}'><img height='20' src='${ICON_MASK}'><br/>ID:112222<br/>Age:12`,
//   src: 'https://worldoffloweringplants.com/wp-content/uploads/2018/10/Gazania-Red-Shades-Treasure-Flower3.jpg'
// }],

const cropImageCount = ref(0)
// canvas

function isAIFeatureOn (fea) {
  return settings.aiSwitchs.indexOf(fea) >= 0
}

const filteredThumbnails = computed(() => {
  return recentThumbnails.value.filter(x => {
    if (x.label === 1 && isAIFeatureOn('face_detail')) {
      return true
    } else if (x.label === 2 && isAIFeatureOn('pedestrian_detail')) {
      return true
    } else if (x.label >= 3 && isAIFeatureOn('car_detail')) {
      return true
    }
  })
})

const ICON_MASK = require('../../res/ai_mask.png')

let thumbId = 1

function renderInfoHtml (d) {
  if (d.label === 1) {
    if (typeof d.faceId !== 'undefined') {
      let ages
      if (locale.value === 'zh-cn') {
        ages = `${d.age}${t('age')}`
      } else {
        ages = `${t('age')}${d.age}`
      }
      return `<div>${t(d.gender ? 'female' : 'male')} | ${ages}<br/>ID: ${d.faceId}${d.mask ? '<br/><img height="16" src="' + ICON_MASK + '">' : ''}<div>`
    } else {
      return `<div><span class="mdi mdi-face mdi-light mdi-24px"></span></div>`
    }
  } else if (d.label === 2) {
    return `<div><span class="mdi mdi-human-male-boy mdi-light mdi-24px"></span></div>`
  } else if (d.label >= 3) {
    return `<div style="padding: 2px; border: 2px solid; border-radius: 3px; background-color: ${d.colorString || 'transparent'}; width: fit-content;">${d.labelString}${d.ocr ? ' | ' + d.ocr : ''}</div>`
  }

  return ''
}

function arrayBufferToDataUrl (arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  /*
  // Obtain a blob: URL for the image data.
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  const urlCreator = window.URL || window.webkitURL;
  const base64 = urlCreator.createObjectURL(blob);
  */
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const len = bytes.length
  let base64 = 'data:image/jpeg;base64,';

  for (let i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if ((len % 3) === 2) {
    base64 = base64.substring(0, base64.length - 1) + '=';
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + '==';
  }

  // base64 = btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ''))
  return base64;
}

function toggleHybird () {
  hybird.value = !hybird.value
  if (hybird.value) {
    cropImageCount.value = 0
  }
}

function onDetection (ai) {
      /*
      ai.objects.forEach(d => {
        if (d.cropImage) {
          console.log(d.label, d.cropImage.byteLength)
        }
      })
      */
  const thumbnails = ai.objects.filter(d => d.cropImage).map(d => ({
    label: d.label,
    html: renderInfoHtml(d),
    key: thumbId++,
    src: arrayBufferToDataUrl(d.cropImage)
  }))

  if (!hybird.value) {
    cropImageCount.value += thumbnails.length
  }

  if (thumbnails.length) {
    curThumbnails.value = thumbnails
    const prevs = recentThumbnails.value.slice(0, 48 - thumbnails.length)
    recentThumbnails.value = thumbnails.concat(prevs)
  }
}

function onPlayStart (url) {
  reset()

  const xaddr = new URL(url)
  if (xaddr.protocol === 'rtsp:') {
    window.document.title = `RTSP [${xaddr.host}]`;
  } else if (xaddr.protocol === 'ws:' || xaddr.protocol === 'wss:') {
    window.document.title = `WebSocket [${xaddr.host}]`;
  } else {
    window.document.title = t('player');
  }
}

function reset () {
  recentThumbnails.value = []
      /*
      recentThumbnails.value = [{
        html: renderInfoHtml({
          label: 1,
          faceConfidence: 1,
          gender: 1,
          mask: 1,
          age: 12,
          labelString: 'MPV',
          colorString: 'green',
          ocr: '沪A12356'
        }),
        src: 'https://worldoffloweringplants.com/wp-content/uploads/2018/10/Gazania-Red-Shades-Treasure-Flower3.jpg'
      }]
      */
  curThumbnails.value = []
  cropImageCount.value = 0
}
</script>

<style lang="scss" scoped>
.hybird-bottom {
  height: 150px;
  width: fit-content;
  color: #e6e6e6; 
  background-color: #000000; 
  display: flex;  
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
}

.thumbnail-block {
  position: relative;
  height: 100%;
  border: 2px solid;
}

.list-item {
  display: inline-block;
  margin-right: 10px;
}
.list-enter-active, .list-leave-active {
  transition: all 1s;
}
.list-enter, .list-leave-to /* .list-leave-active below version 2.1.8 */ {
  opacity: 0;
  transform: translateY(30px);
}
</style>
