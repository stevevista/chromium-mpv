// nameing with postfix 'Plugin', to workaround test script without window.require
import PlayerPlugin from './player'
import LivePlayerPlugin from './live'

/* eslint-disable accessor-pairs */
/* eslint-disable dot-notation */

const mimePlayer = 'application/x-player'
const mimeLive = 'application/x-live'

function attrTrue (val) {
  return val === '' ||
    (!!val && val !== '0' && val !== 'false');
}

class BasePlayerElement extends HTMLElement {
  constructor () {
    super()

    const shadowRoot = this.attachShadow({ mode: 'closed' });
    shadowRoot.innerHTML = this.constructor._innerHTML

    this._root = shadowRoot

    const el = shadowRoot.querySelector('#player');

    let readyResolvers = []
    let loadError = null
  
    const onReady = (e) => {
      if (e.data && e.data.type === 'ready') {
        el.removeEventListener('message', onReady)

        if (e.data.data) {
          this.$player = new this.constructor._PluginClass(el)
          typeof this._init === 'function' && this._init();
          readyResolvers.forEach(([resolve]) => resolve())
        } else {
          loadError = new Error('load plugin fail')
          readyResolvers.forEach(([, reject]) => reject())
        }

        readyResolvers = []
      }
    }

    this.whenReady = () => new Promise((resolve, reject) => {
      if (this.$player) {
        return resolve();
      } else if (loadError) {
        return reject(loadError);
      }

      readyResolvers.push([resolve, reject])
    })
  
    el.addEventListener('message', onReady)
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.whenReady()
      .then(() => {
        this._attributeChangedCallback(name, oldValue, newValue)
      })
      .catch(console.error)
  }

  async load (...args) {
    await this.whenReady()
    return this.$player.load(...args)
  }

  stop () {
    if (!this.pluginIsDestroyed()) {
      this.$player?.quit()
    }
  }

  queryProperty (name) {
    return this.$player?.props[name]
  }

  pluginIsDestroyed () {
    return !this.$player || typeof this.$player.$el.postMessage !== 'function'
  }
}

// replace addEventListener
const transferEvents = [
  'start-file',
  'end-file',
  'file-loaded',
  'detection',
  'record-path',
  'error-msg',
  'screenshot',
  'auth-require',
  'prop-change',
  'scrcpy-control',
  'message',
  'profiling',
  'first-picture',
]

const originListener = BasePlayerElement.prototype.addEventListener

BasePlayerElement.prototype.addEventListener = function (type, listener, ...args) {
  if (transferEvents.indexOf(type) >= 0) {
    this.whenReady()
      .then(() => {
        if (type === 'auth-require') {
          this.$player.on_auth_require(listener)
        } else if (type === 'message') {
          this.$player.$el.addEventListener(type, listener, ...args)
        } else {
          this.$player.register_event(type, listener)
        }
      })
  } else {
    originListener.call(this, type, listener, ...args)
  }
}

class PlayerElement extends BasePlayerElement {
  static get _innerHTML () {
    return `
      <embed id="player" type="${mimePlayer}" style="pointer-events:none; display: block; width: 100%; height: 100%" />
    `
  }

  static _PluginClass = PlayerPlugin

  // Specify observed attributes so that
  // attributeChangedCallback will work
  static get observedAttributes () {
    return [
      'src',
      'hwaccel',
      'ai-switch',
      'locale',
      'online-detection',
      'screenshot-path',
      'screenshot-format',
      'transport',
      'video-sync',
      'disable-audio',
      'volume',
      'mute'
    ];
  }

  _init () {
    // gloabl option
    this.$player.option('network-timeout', 10)
    this.$player.option('demuxer-lavf-o', 'stimeout=10000000', 'add')
    this.$player.option('osd-font-size', 30)
    this.$player.option('osd-duration', 2000)
    this.$player.option('screenshot-template', 'pic-%tY%tm%td-%tH%tM-%ws')

    const logPath = this.getAttribute('debug-log')
    if (logPath) {
      this.$player.option('log-file', logPath)
    }
  }

  _attributeChangedCallback (name, oldValue, newValue) {
    switch (name) {
      case 'locale':
        this._updateAISwitchAndLocale(null, newValue)
        break;
      case 'ai-switch':
        this._updateAISwitchAndLocale(newValue, null)
        break;
      case 'online-detection':
        this.$player.option('hot-detection', attrTrue(newValue))
        break
      case 'screenshot-path':
        if (newValue) {
          this.$player.option('screenshot-directory', newValue)
        }
        break
      case 'screenshot-format':
        if (newValue) {
          this.$player.option('screenshot-format', newValue)
        }
        break
      case 'transport':
        if (newValue !== null) {
          this.$player.option('rtsp-transport', newValue)
        }
        break
      case 'video-sync':
        this.$player.setSyncOptions(newValue)
        break
      case 'hwaccel':
        if (newValue !== null) {
          if (newValue === 'none' || !newValue) {
            this.$player.option('hwdec', 'no')
          } else {
            this.$player.option('hwdec', 'auto')
          }
        }
        break
      case 'disable-audio':
        this.$player.option('audio', attrTrue(newValue) ? 'no' : 'auto')
        break

      case 'volume': {
        const vol = parseInt(newValue)
        if (!isNaN(vol)) {
          this.$player.property('volume', vol)
        }
        break
      }

      case 'mute': {
        const val = attrTrue(newValue)
        this.$player.property('mute', val)
        break
      }
    }
  }

  _updateAISwitchAndLocale (_aiSwitch, _locale) {
    const aiSwitch = _aiSwitch === null ? this.getAttribute('ai-switch') : _aiSwitch
    const locale = _locale === null ? this.getAttribute('locale') : _locale

    if (aiSwitch === null) {
      return
    }

    if (!aiSwitch) {
      this.$player.option('sub-visibility', false)
    } else {
      this.$player.option('sub-visibility', true)
      if (locale === null) {
        this.$player.option('sub-ass-styles', `${aiSwitch}`)
      } else {
        // include ai locale
        this.$player.option('sub-ass-styles', `${aiSwitch},|${locale}`)
      }
    }
  }

  enableKeys (v) {
    this.whenReady()
      .then(() => {
        this.$player.listenKeydown(v)
      })
  }

  screenshot (...args) {
    if (args[0] !== false) {
      const { each, subtitles } = (args[0] || {})
      if (each) {
        const { screenshotting } = this.$player.props
        this.$player.triggerProp('screenshotting', !screenshotting)
      }
      this.$player.command('osd-auto', 'screenshot', (each ? 'each-frame+' : '') + (subtitles ? 'subtitles' : 'video'))
    }
  }

  get_dimensions () {
    return this.$player.get_dimensions()
  }
}

// generate function
[
  'option',
  'property',
  'command',
  'seekPercent',
  'seek',
  'toggle_play',
  'crop',
  'prev_frame',
  'next_frame'
].forEach(name => {
  PlayerElement.prototype[name] = async function (...args) {
    await this.whenReady()
    return this.$player[name](...args)
  }
})

class LiveElement extends BasePlayerElement {
  static get _innerHTML () {
    return `
      <embed id="player" type="${mimeLive}" style="pointer-events:none; display: block; width: 100%; height: 100%" />
    `
  }

  static _PluginClass = LivePlayerPlugin

  static get observedAttributes () {
    return [
      'src',
      'locale',
      'ai-switch',
      'online-detection',
      'smart-record',
      'volume',
      'mute',
      'fill-content'
    ];
  }

  _attributeChangedCallback (name, oldValue, newValue) {
    switch (name) {
      case 'src':
        if (newValue) {
          setTimeout(() => this.play(), 0)
        } else {
          this.stop()
        }
        break
  
      case 'ai-switch':
        this.$player.command('set-ai-options', newValue || '')
        break
  
      case 'online-detection':
        this._updateOnlineDetectionAttrs(newValue, null)
        break
      case 'smart-record':
        this._updateOnlineDetectionAttrs(null, newValue) 
        break
      case 'locale':
        if (newValue) {
          this.$player.setLocale(newValue)
        }
        break

      case 'volume': {
        const vol = parseInt(newValue)
        if (!isNaN(vol)) {
          this.$player.command('set-volume', vol)
        }
        break
      }

      case 'mute': {
        const val = attrTrue(newValue)
        this.$player.command('set-mute', val)
        break
      }

      case 'fill-content': {
        this.$player.command('crop', [0, 0, attrTrue(newValue) ? -1 : 0]);
        break;
      }
    }
  }

  _updateOnlineDetectionAttrs (onAttr, recordAttr) {
    const on = attrTrue(onAttr === null ? this.getAttribute('online-detection') : onAttr)
    const record = attrTrue(recordAttr === null ? this.getAttribute('smart-record') : recordAttr)
    const basePath = this.getAttribute('screenshot-path') || ''
    this.$player.command('online-detection', { on, record, basePath })
  }

  play (argopt = {}) {
    if (argopt.src === undefined) {
      argopt.src = this.getAttribute('src')
    }

    if (!argopt.src) {
      return
    }

    const url = decodeURIComponent(argopt.src)

    const debug_log = this.getAttribute('debug-log')
    const hwaccel = this.getAttribute('hwaccel')
    const disable_audio = attrTrue(this.getAttribute('disable-audio'))
    const auto_scale = attrTrue(this.getAttribute('auto-scale'))
    const profiling = attrTrue(this.getAttribute('profiling'))
  
    let transport

    // __settings assigned to ipc web in preloads
    const settings = window.__settings || { player: {} }

    if (this.hasAttribute('transport')) {
      transport = this.getAttribute('transport') || 'udp'
    } else {
      transport = settings.player.streamingType || 'udp'
    }

    const options = {
      profiling,
      'auto-scale': auto_scale,
      an: disable_audio,
      timeout: 5,
      username: argopt.username || this.getAttribute('username'),
      password: argopt.password || this.getAttribute('password')
    }

    if (debug_log) {
      options['report'] = debug_log
    }

    if (hwaccel && hwaccel !== 'none') {
      options['hwaccel'] = hwaccel
    }

    if (url.match(/^rtsp:\/\/(.*)/)) {
      options['max_delay'] = 0
      options['flags'] = 'low_delay+unaligned'
      // -fflags nobuffer -analyzeduration 1000000 -rtsp_transport tcp
      options['rtsp_transport'] = transport
    }

    this.$player.load(url, 'replace', options);
  }

  set fullscreen (v) {
    this.$player?.property('fullscreen', v)
  }

  crop (...args) {
    return this.$player.zoom(...args)
  }

  screenshot (options) {
    if (options === false) {
      this.$player.command('screenshot', { cancel: true })
    } else {
      if (!options.basePath) {
        options.basePath = this.getAttribute('screenshot-path') || ''
      }
      this.$player.command('screenshot', options)
    }
  }

  reload () {
    this.$player.request('quit', 2);
  }

  talk (...args) {
    if (args[0] === false) {
      this.$player.command('talk', { cancel: true });
    } else {
      this.$player.command('talk', ...args);
    }
  }

  record (options) {
    if (options === false) {
      this.$player.command('record', { cancel: true });
    } else {
      if (!options.basePath) {
        options.basePath = this.getAttribute('screenshot-path') || ''
      }
      this.$player.command('record', options);
    }
  }
}

customElements.define('x-player', PlayerElement)
customElements.define('x-live', LiveElement)

/*
------------ local player -----------------
<x-player
  src="string"
  debug-log="string"
  hwaccel="string"
  locale="string"
  ai-switch="string array[a,b,c,...]"
  online-detection="boolean"
  screenshot-path="string"
  screenshot-format="jpeg|png"
  transport="tcp|udp"
  video-sync="audio|video|nodelay"
  disable-audio="boolean"
  volume="int[0~100]"
  mute="boolean"
  show-loading="boolean" # persistant
>
</x-player>

[api]
object.queryProperty(name) -> value or undefined
object.load(src, mode, options)
object.play()
object.stop()
object.option(name, value)
object.property(name, value)
object.command({...})
object.seekPercent(...)
object.seek(...)
object.toggle_play()
object.prev_frame()
object.next_frame()
object.crop([x0, y0, x1, y1])
object.screenshot({each, subtitles} | false)

[events] object.addEventListener(event, listener)
prop-change: (name, value)
start-file: empty
file-loaded: empty
end-file: empty
auth-require: (url)

------------ live player -----------------

<x-live
  src="string"
  debug-log="string"
  auto-scale="boolean"
  disable-audio="boolean"
  hwaccel="string"
  transport="tcp|udp"
  locale="string"
  ai-switch="string array[a,b,c,...]"
  online-detection="boolean"
  smart-record="boolean"
  screenshot-path="string"
  username="string"
  password="string"
  volume="int[0~100]"
  mute="boolean"
  fill-content="boolean"
  show-loading="boolean" # persistant
>
</x-live>

[api]
object.queryProperty(name) -> value or undefined
object.load(src, mode, options)
object.reload()
object.play()
object.stop()
object.screenshot({name, basePath, format, detection, maxCount, interval, scheduleType} | false)
object.talk({encoding, sampleRate, bitRate} | false)
object.record({name, basePath, limitBytes} | false)
object.crop([x0, y0, x1, y1])

[property set]
object.fullscreen = boolean

[events] object.addEventListener(event, listener)
prop-change: (name, value)
 *name list
   -  path
   -  fileFormat
   -  videoCodec
   -  audioCodec
   -  duration
   -  timePos
   -  fps
   -  drops
   -  fullscreen
   -  screenshotting
   -  talking
   -  recording
   -  idle
   -  width
   -  height
   -  mute

start-file: empty
file-loaded: empty
end-file: empty
record-path: (path)
error-msg: (msg)
detection: ([detection objects])
screenshot: ({path, success})
auth-require: (url)

[example]

<body>
  <div>
    <x-live
      src=""
      transport="udp"
      locale="zh-CN"
      ai-switch="face,car,face_detail"
      volume="100"
      fill-content
    >
    </x-live>
  </div>
  <script>
    const el = document.querySelector('x-live')
    el.setAttribute('src', 'rtsp://10.21.86.207/live&t=unicast&p=rtsp&token=PROFILE_000');

    el.addEventListener('auth-require', (url) => {
      console.error('server require crentials')
      // get credentials from database or somewhere else
      el.setAttribute('username', ...)
      el.setAttribute('password', ...)
      // try play agin
      el.play()
    })

    el.addEventListener('file-loaded', () => {
      // start recording when play success started
      el.record({name: 'D:\\dev\\test.mp4'})
    })

    el.addEventListener('end-file', () => {
      // stop record when play end
      // in fact, this is no need, recording will be terminated automaticlly
      el.record(false)
    })

    el.addEventListener('prop-change', (name, value) => {
      if (name === 'recording') {
        if (value) {
          console.log('recording startted')
        }
      }
    })
  </script>
<body>
*/
