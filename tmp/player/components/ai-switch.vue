<template>
  <div class="menu-buttons">
    <button 
      class="player-icon"
      @click.stop="toggleAISwitch"
      :title="t(urn ? (analyticsOn ? 'video.detection_on' : 'video.detection_off') : 'video.detection')"
    >
      <span class="mdi mdi-face-recognition mdi-light mdi-24px" :class="{'mdi-inactive': !hasDetectionOn || !analyticsOn}"></span>
    </button>
    <button
      v-for="item in items"
      :key="item.key"
      class="player-icon"
      :class="{disabled: !analyticsOn, enhanced: item.enhanced}"
      :disabled="!analyticsOn"
      @click.stop="toggleAI(item.key)"
      :title="t(item.tooltip)"
    >
      <span :class="{
        'mdi': true,
        [`mdi-${item.icon}`]: true,
        'mdi-light': true,
        'mdi-24px': true,
        'mdi-inactive': settings.aiSwitchs.indexOf(item.key) < 0
      }"></span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useSettings } from '~/renderer/store/common-store'
import { toggleAI } from '../store'
import { useI18n } from 'vue-i18n'

const notice = inject('notice')

const settings = useSettings()
const { t } = useI18n()

const emit = defineEmits(['ai-configured'])

const props = defineProps({
  urn: { type: String, default: null },
  deviceSwitch: { type: Boolean, default: false },
})

const analytics = ref(false)
const analyticsReconfigured = ref(false)

const analyticsOn = computed(() => !props.deviceSwitch || !props.urn || analytics.value)

const hasDetectionOn = computed(() => settings.aiSwitchs.length > 0)

const items = [
  {
    key: 'vehicle',
    tooltip: 'ai.vehicle',
    icon: 'car-hatchback'
  },
  {
    key: 'pedestrian',
    tooltip: 'ai.pedestrian',
    icon: 'human-male-boy'
  },
  {
    key: 'face',
    tooltip: 'ai.face',
    icon: 'face-man'
  },
  {
    key: 'car_detail',
    tooltip: 'ai.vehicle_rec',
    icon: 'car-hatchback',
    enhanced: true
  },
  {
    key: 'pedestrian_detail',
    tooltip: 'ai.pedestrian_rec',
    icon: 'human-male-boy',
    enhanced: true
  },
  {
    key: 'face_detail',
    tooltip: 'ai.face_rec',
    icon: 'face-man-shimmer-outline',
    enhanced: true
  }
]

let initialAnalytics = false

watch(() => props.urn, async v => {
  if (!props.deviceSwitch) {
    return
  }

  if (v) {
    try {
      analytics.value = await window.electron.onvif.queryAnalyticsEnables(v)
    } catch (e) {
      console.error(e)
    }

    initialAnalytics = analytics.value
  }
}, {
  immediate: true
})

async function toggleAISwitch () {
  if (!props.deviceSwitch) {
    toggleAI('all')
    return
  }

  try {
    await window.electron.onvif.toggleAnalytics(props.urn, !analytics.value)

    // query again
    analytics.value = await window.electron.onvif.queryAnalyticsEnables(props.urn)

    if (analytics.value && !initialAnalytics && !analyticsReconfigured.value) {
      analyticsReconfigured.value = true
      emit('ai-configured')
    }

    if (analytics.value && !settings.aiSwitchs.length) {
          // open defaults if none selected
      toggleAI('all')
    } else if (!analytics.value) {
      settings.aiSwitchs = []
    }

    if (analytics.value) {
      // turn on major modules
      await window.electron.onvif.modifyAnalyticsModules(props.urn, {
        MotionRegionDetector: true,
        FaceRecognition: true,
        CarRecognition: true
      })
    }
  } catch (e) {
    notice(e.message, 5000)
    console.error(e)
  }
}
</script>

<style lang="scss" scoped>
.menu-buttons {
  .enhanced {
    color: #fff;
    border: 2px dashed;
  }

  .disabled {
    opacity: 0.4;
  }
}
</style>
