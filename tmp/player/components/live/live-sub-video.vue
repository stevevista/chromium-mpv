<template>
  <div class="sub-player"
    @contextmenu.stop
  >
    <div class="video-wrap">
      <LivePlayer
        :src="url"
        v-model:show-info="showInfoPanel"
        v-model:fullscreen="fullscreen"
        @update-properties="onUpdateProperties"
        mute
      />
      <div class="player-bezel">
        <span class="player-bezel-play-icon" v-bind:class="{'ended-icon' : propertites.idle}" v-show="propertites.idle && !!url">
          <span :class="`mdi mdi-${propertites.idle ? (propertites.unauthed ? 'account-lock' : 'link-off') : 'play'} mdi-light mdi-36px`"></span>
        </span>
      </div>
    </div>
    
    <SubVideoControls 
      :id="id"
      :streams="streams"
      v-model:show-info="showInfoPanel"
      v-model:fullscreen="fullscreen"
      :timePos="propertites.timePos"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import LivePlayer from './live-player'
import SubVideoControls from './sub-video-controls'

const props = defineProps({
  id: Number,
  streams: Array,
  selected: Boolean,
})

const showInfoPanel = ref(false)
const fullscreen = ref(false)

const propertites = reactive({
  timePos: 0,
  idle: true,
  unauthed: false,
})

function onUpdateProperties (name, value) {
  propertites[name] = value
}

const url = computed(() => (props.selected && props.streams[props.id]?.url) || '')
</script>

<style lang="scss" scoped>
.sub-player {

  flex: 1;
  overflow: hidden;
  height: 100%;
  line-height: 1;
  position: relative;
  user-select: none;

  * {
    box-sizing: content-box;
  }

  &:-webkit-full-screen {
    width: 100%;
    height: 100%;
    background: #000;
    position: fixed;
    z-index: 100000;
    left: 0;
    top: 0;
    margin: 0;
    padding: 0;
    transform: translate(0, 0);
  }
}

.video-wrap {
  height: 100%;
  position: relative;
  font-size: 0;

  .player-bezel {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    font-size: 22px;
    color: #fff;
    pointer-events: none;

    .player-bezel-play-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        margin: -30px 0 0 -30px;
        height: 60px;
        width: 60px;
        padding: 13px;
        box-sizing: border-box;
        background: rgba(255, 255, 255, .1);
        border-radius: 50%;
        pointer-events: none;
        &.ended-icon {
          background: rgba(0, 0, 0, 0.7);
        }
    }
  }
}
</style>
