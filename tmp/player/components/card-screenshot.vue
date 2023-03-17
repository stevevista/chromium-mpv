<template>
  <div style="background: rgba(0, 0, 0, 0.7);">
    <div class="screenshot-settings">
      <v-list dense>
        <v-list-item>
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.settings.snapshot_format') }}</span><span class="pr-4"/>
            <n-radio-group v-model:value="settings.screenshotFormat">
              <n-radio-button value="png" label="PNG"/>
              <n-radio-button value="jpeg" label="JPEG"/>
            </n-radio-group>
          </v-list-item-title>
        </v-list-item>

        <v-list-item>
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.settings.snapshot_dir') }}</span><span class="pr-4"/>
            <n-button text @click="selectFolder">
              <span class="mdi mdi-folder-open mdi-24px"></span>
            </n-button>
            <span><span class="pr-4"/>{{ settings.screenshotPath }}</span>
          </v-list-item-title>
        </v-list-item>

        <v-list-item v-if="scheduler">
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.snapshot_mode') }}</span><span class="pr-4"/>
            <n-radio-group v-model:value="settings.screenshotIntervalType">
              <n-radio-button value="time" :label="t('video.shot_by_time')"/>
              <n-radio-button value="frame" :label="t('video.shot_by_frame')"/>
            </n-radio-group>
          </v-list-item-title>
        </v-list-item>
        <v-list-item v-show="scheduler && settings.screenshotIntervalType==='time'">
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.shot_by_time') }} (>= 20)</span><span class="pr-4"/>
            <span class="setting-item-ctrl-content">
              <n-input-number v-model:value="settings.screenshotIntervalTime" :min="20" />
            </span>
          </v-list-item-title>
        </v-list-item>
        <v-list-item v-show="scheduler && settings.screenshotIntervalType==='frame'">
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.shot_by_frame') }} (1 ~ 1000)</span><span class="pr-4"/>
            <span class="setting-item-ctrl-content">
              <n-input-number v-model:value="settings.screenshotIntervalFrame" :min="1" :max="1000" />
            </span>
          </v-list-item-title>
        </v-list-item>

        <v-list-item v-if="scheduler">
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.max_count') }} (1 ~ 300)</span><span class="pr-4"/>
            <span class="setting-item-ctrl-content">
              <n-input-number v-model:value="settings.screenshotMaxCount" :min="1" :max="300" />
            </span>
          </v-list-item-title>
        </v-list-item>

        <v-list-item>
          <v-list-item-title>
            <span class="setting-item-label text-right">{{ t('video.settings.shot_with_detection') }}</span><span class="pr-4"/>
            <span class="setting-item-ctrl-content">
              <n-switch
                v-model:value="settings.screenshotWithAI"
              ></n-switch>
            </span>
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettings } from '~/renderer/store/common-store'
import { selectScreenshotFolder } from '../store';
import { NSwitch, NRadioGroup, NRadioButton, NButton, NInputNumber } from 'naive-ui'
import {
  VList,
  VListItem,
  VListItemTitle,
} from 'vuetify/components'

const settings = useSettings()
const { t } = useI18n()

const props = defineProps({
  scheduler: {type: Boolean, default: false}
})

const rules = {
  range: value => (+value > 0 && +value < 1000) || ''
}

watch(() => settings.screenshotFormat, (screenshotFormat) => {
  settings.save({ screenshotFormat })
})

watch(() => settings.screenshotIntervalType, (screenshotIntervalType) => {
  settings.save({ screenshotIntervalType })
})

watch(() => settings.screenshotWithAI, (screenshotWithAI) => {
  settings.save({ screenshotWithAI })
})

let _t3
let _t1
let _t2

watch(() => settings.screenshotIntervalFrame, (v) => {
  v = parseInt(v)
  clearTimeout(_t3);
  if (v < 1) {
    _t3 = setTimeout(() => { settings.screenshotIntervalFrame = 1 }, 800)
  } else if (v > 1000) {
    _t3 = setTimeout(() => { settings.screenshotIntervalFrame = 1000 }, 800)
  } else {
    settings.save()
  }
})

watch(() => settings.screenshotIntervalTime, (v) => {
  v = parseInt(v)
  clearTimeout(_t1);
  if (v < 20) {
    // this.$nextTick(() => { settings.screenshotIntervalTime = 20 })
    _t1 = setTimeout(() => {
      settings.screenshotIntervalTime = 20;
    }, 800)
  } else {
    settings.save()
  }
})

watch(() => settings.screenshotMaxCount, (v) => {
  v = parseInt(v)
  clearTimeout(_t2);
  if (v < 1) {
    _t2 = setTimeout(() => { settings.screenshotMaxCount = 1 }, 800)
  } else if (v > 300) {
    _t2 = setTimeout(() => { settings.screenshotMaxCount = 300 }, 800)
  } else {
        settings.save()
  }
})

function selectFolder () {
  selectScreenshotFolder()
}
</script>

<style lang="scss" scoped>
.screenshot-settings {
  height: 100%;
  .setting-item-label {
    width: 180px;
    display: inline-block;
  }

  .setting-item-ctrl-content {
    display: inline-block;
  }
}
</style>
