<template>
  <div
    class="playList"
    @contextmenu.stop
  >
    <div class="my-arrow" v-show="isShowArrow">
      <v-icon color="white" @click.stop="hideList" :icon="isHidenList ? 'mdi-chevron-double-left' : 'mdi-chevron-double-right'"></v-icon>
    </div>
    <div 
      class="content-container"
      v-show="!isHidenList"
      @drop.stop="addFile" @dragover.prevent
    >
      <div :style="{ padding: '0 10px', overflowY: 'scroll', flexGrow: 1 }">
        <div
          v-for="(item, index) in playlist"
          :key="item.id"
          :style="{ border: `1px solid rgba(255,255,255,${item.current ? 1 : 0.3})` }"
          role="button"
          class="segment"
          @mouseenter="hoverId = index"
          @mouseleave="hoverId = -1"
          @dblclick="() => player.command('playlist-play-index', index)"
        >
          <div class="text-name">
            <span class="mdi mdi-filmstrip" :style="{ fontSize: '16px', marginRight: '5px', verticalAlign: 'middle' }"></span>
            {{ item.filename }}
          </div>
          <div class="text-fullname">
            {{ item.filename }}
          </div>
          <div
            v-show="hoverId===index"
            :style="{ position: 'absolute', right: '0px', bottom: '0px', display: 'flex' }"
          >
            <!-- <span class="mdi mdi-arrow-up-circle" :style="{ fontSize: '20px', height: '24px' }"></span> -->
            <!-- <span class="mdi mdi-arrow-down-circle" :style="{ fontSize: '20px', height: '24px' }"></span> -->
            <span class="mdi mdi-trash-can" 
              :style="{ fontSize: '20px', height: '24px', color: 'red' }"
              @click="() => player.command('playlist-remove', index)"
            ></span>
          </div>
        </div>
      </div>

      <!-- footer -->
      <div class="footer">
        <n-button size="small" color="#8a2be2"
          :style="{ margin: '0px 2px' }"
          @click="addItem"
        >
          <template #icon>
            <span class="mdi mdi-plus"></span>
          </template>
        </n-button>

        <n-button size="small" color="#8a2be2"
          :style="{ margin: '0px 2px' }"
          @click="removeAll"
        >
          <template #icon>
            <span class="mdi mdi-trash-can"></span>
          </template>
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { NButton, NInput, NModal, NInputNumber, useNotification } from 'naive-ui'

const props = defineProps({
  player: Object,
  playlist: {type: Array, default: () => []},
  isShowArrow: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-items'])

const isHidenList = ref(true)

const hoverId = ref(-1)

function removeAll () {
  props.player.command('playlist-clear');
  props.player.command('playlist-remove', 'current');
}

function addItem () {
  emit('add-items');
}
    
function hideList () {
  isHidenList.value = !isHidenList.value;
}

async function addFile (e) {
  emit('add-items', e.dataTransfer.items)
}
</script>

<style scoped lang="scss">
.playList {
  position: absolute;
  top: 0;
  right: 0;
  height: calc(100% - 48px);
  background-color: rgba(0, 0, 0, 0.4);
  border-left: 1px solid #2f2f31;
  .content-container {
    height: 100%;
    overflow:hidden;
    position: relative;
    width: 300px;
    display: flex;
    flex-direction: column;
  }
  .my-arrow {
    position: absolute;
    top: 50%;
    left: -31px;
    transform: translateY(-50%);
    width: 30px;
    height: 66px;
    line-height: 66px;
    text-align: center;
    cursor: pointer;
    > span {
      width: 100%;
      line-height: 66px;
    }
  }
  .top {
    padding: 15px 15px 5px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    > span {
      font-size: 15px;
    }
    .my-icon {
      display: flex;
      flex-direction: row;
      align-items: center;
      font-size: 15px;
      position: relative;
      > span {
        cursor: pointer;
        &:hover {
          color: #1bb017;
        }
      }
      > span + span {
        margin-left: 10px;
      }
      > .delete {
        font-size: 14px;
      }
    }
  }
}

.list-content {
  overflow: auto;
}
.top {
  max-height: 40px;
  transition: width 1s;
  overflow: hidden;
}

.active_list-item {
  background-color: rgba(93, 238, 0, 0.5);
}

.list-tem-text {
  color: white;
  white-space: normal;
  word-break: break-all
}

.segment {
  margin: 5px 0;
  padding: 5px;
  border-radius: 5px;
  position: relative;
}

.footer {
  display: flex;
  padding: 5px 0;
  align-items: center;
  justify-content: center;
}

.text-name {
  width: 100%;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  white-space: nowrap;
  color: white;
  margin-bottom: 3px;
}

.text-fullname {
  font-size: 13px;
  word-break: break-all;
}
</style>
