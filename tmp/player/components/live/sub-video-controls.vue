<template>
  <div class="player-bottom-controller" @contextmenu.stop>
    <!-- left -->
    <div class="player-icons player-icons-left">
      <icon-button
        :icon="`numeric-${id + 1}-box`"
        @click="selectStream(id)"
        :tooltip="streams[id]?.name"
      />
      <span class="player-time">{{ formatSeconds(timePos) }}</span>
    </div>

    <!-- right -->
    <div class="player-icons player-icons-right">
      <icon-button
        icon="information-outline"
        :tooltip="t('video.info')"
        @click="emit('update:show-info', !showInfo)"
      />
      <icon-button
        :icon="fullscreen ? 'fullscreen-exit' : 'crop-free'"
        @click="emit('update:fullscreen', !fullscreen)"
        :tooltip="t('video.Full_screen')"
      />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { formatSeconds } from '../utils'
import { useI18n } from 'vue-i18n'
import IconButton from '../icon-button'

const selectStream = inject('selectStream')

const props = defineProps({
  id: Number,
  streams: Array,
  timePos: { type: Number, default: 0 },
  showInfo: { type: Boolean, default: false },
  fullscreen: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show-info', 'update:fullscreen'])
const { t } = useI18n() 
</script>
