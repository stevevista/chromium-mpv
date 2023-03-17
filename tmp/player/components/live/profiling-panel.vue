<template>
  <div class="profiling-panel">
    <div 
      class="panel-item"
      v-for="(item, i) in profilings"
      :key="i"
    >
      <span class="panel-item-tick">{{ item.tick }}</span>
      <span :class="tagClass(item.tag)"></span>
      <span class="panel-item-line"> {{ profilingLine(item) }} </span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  profilings: Array,
})

const PROFILING_START_CONNECT = 0
const PROFILING_CONNECTED = 1
const PROFILING_CHANNEL_SETUP = 2
const PROFILING_FIRST_PACKET_RECV = 3
const PROFILING_PACKET_READ = 4
const PROFILING_VIDEO_PACKET_READ = 5
const PROFILING_FIRST_PIC_DECODED = 6
const PROFILING_SEND = 7
const PROFILING_RSP = 8
const PROFILING_READ_RSP_ERR = 9

function tagClass (tag) {
  if (tag === PROFILING_SEND) {
    return 'panel-item-tag req'
  } else if (tag === PROFILING_RSP) {
    return 'panel-item-tag rsp'
  } else if (tag === PROFILING_READ_RSP_ERR) {
    return 'panel-item-tag err'
  } else {
    return 'panel-item-tag normal'
  }
}

function profilingLine ({ tick, tag, arg0, arg1, text }) {
  switch (tag) {
    case PROFILING_START_CONNECT:
      return `start`
    case PROFILING_CONNECTED:
      return `connected`
    case PROFILING_CHANNEL_SETUP:
      return `tracks created`
    case PROFILING_FIRST_PACKET_RECV:
      return `received first packet`
    case PROFILING_PACKET_READ:
      {
        let type
        switch (arg1) {
          case 0: 
            type = 'audio'
            break
          case 1:
            type = 'ai'
            break
          default:
            type = `other (idx: ${arg0})`
            break
        }
        return `received ${type} packet`
      }
    case PROFILING_VIDEO_PACKET_READ:
      return `received VIDEO packet`
    case PROFILING_FIRST_PIC_DECODED:
      return `first VIDEO frame decoded`
    case PROFILING_READ_RSP_ERR:
      return `Server closed connection, err = ${arg0}`
    case PROFILING_SEND:
    case PROFILING_RSP:
      return text
  }
}
</script>

<style lang="scss" scoped>
.profiling-panel {
  user-select: text;
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 40px;
  background: rgba(28, 28, 28, 0.6);
  padding: 10px;
  color: #fff;
  font-size: 12px;
  border-radius: 2px;
  overflow-y: auto;

  .panel-item {
    width: 100%;
    margin-top: 2px;
    & > span {
      display: inline-block;
      vertical-align: middle;
      line-height: 15px;
      overflow: hidden;
      overflow-wrap: break-word;
    }
  }

  .panel-item-tick {
    width: 45px;
    text-align: right;
    margin-right: 10px;
    border-radius: 4px;
    background: #DD2C00;
  }

  .panel-item-tag {
    width: 15px;
    height: 15px;
    text-align: right;
    margin-right: 10px;
    border-radius: 50%;
    
    &.normal {
      background: #BDBDBD;
    }

    &.req {
      background: #B39DDB;
    }

    &.rsp {
      background: #4CAF50;
    }

    &.err {
      background: #f00;
    }
  }

  .panel-item-line {
    width: calc(100% - 100px)
  }
}

</style>
