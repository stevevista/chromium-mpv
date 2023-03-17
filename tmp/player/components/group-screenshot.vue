<template>
  <div class="menu-buttons">
    <icon-button
          :disabled="disabled"
          :spin="working"
          :icon="working ? 'camera-iris' : 'camera'"
          :tooltip="t(working ? 'video.snapshot_working' : 'video.snapshot')"
          @click="emit(working ? 'screenshot-stop' : 'screenshot')"/>
    <icon-button
          :disabled="working || disabled"
          icon="image-multiple"
          @click="emit('screenshot-multi')"
          :tooltip="t(scheduler ? 'video.schedule_shot' : 'video.shot_each')"/>
    <icon-button
          :disabled="working"
          icon="cog"
          @click="dialogScreenshot=true"
          :tooltip="t('common.setting')"/>

    <n-modal
      v-model:show="dialogScreenshot"
    >
      <CardScreenshot :scheduler="scheduler" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NModal } from 'naive-ui'
import IconButton from './icon-button'
import CardScreenshot from './card-screenshot'

const props = defineProps({
  disabled: {type: Boolean, default: false},
  working: {type: Boolean, default: false},
  scheduler: {type: Boolean, default: false}
})

const emit = defineEmits(['screenshot-stop', 'screenshot', 'screenshot-multi'])

const { t } = useI18n()
const dialogScreenshot = ref(false)
</script>
