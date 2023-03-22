import { LitElement, css, html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { classMap } from 'lit/directives/class-map.js'
import { updateWhenLocaleChanges } from './localized'
import XControlBar from './control-bar'
import MpvClient from './mpv-client'
import { parseURL } from './utils'
import ControlClient from './scrcpy/control-client'
import './loading'
import './media-info'
import './notice'
import i18n from '../i18n'

// Styles and controls copy from https://github.com/DIYgod/DPlayer

const dispatchEvents = [
  'start-file',
  'end-file',
  'file-loaded',
  'tracks-changed',
  'track-switched',
  // 'log-message',
  // 'idle',
  // 'pause',
  // 'unpause',
  // 'tick',
  // 'video-reconfig',
  // 'audio-reconfig',
  // 'etadata-update',
  // 'seek',
  // 'playback-restart',
  'chapter-change',
]

export default class XVideo extends LitElement {
  static styles = css`
  :host {
    position: relative;
    display: block;
    background-color: #000;
  }

  .video-wrap {
    width: 100%;
    height: 100%;
  }

  .video-wrap embed {
    pointer-events:none; 
    display: block;
    width: 100%;
    height: 100%
  }

  x-control-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0 20px;
    transition: opacity 1s;
  }

  .hide {
    opacity: 0;
  }

  .show {
    opacity: 1;
  }

  x-media-info {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 400px;
  }

  .bezel-play-icon {
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
    cursor: pointer;
    transition: opacity 1s;
  }

  .player-crop-selection {
    position: absolute;
    border-color: #fff;
    border:2px dashed;
    pointer-events:none;
    color: #fff;
  }

  .player-status {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 12px;
    .player-speed {
      background-color: rgba(255, 0, 0, 0.3);
    }
    .player-cancel-zoom {
      background-color: rgba(128, 0, 128, 0.3);
    }
  }

  .player-status span {
    border-radius: 2px;
    padding: 4px 6px;
    color: #fff;
    border:1px dashed;
    transition: all .3s ease-in-out;
    overflow: hidden;
  }

  .player-status .player-speed {
    background-color: rgba(255, 0, 0, 0.3);
  }

  .player-status .player-cancel-zoom  {
    background-color: rgba(128, 0, 128, 0.3);
  }
  `

  static shadowRootOptions = { mode: 'closed' }

  static properties = {
    enableKey: { type: Boolean, attribute: 'enable-key' },
    enableCrop: { type: Boolean, attribute: 'enable-crop' },
    showInfo: { type: String, reflect: true, attribute: 'show-info' },
    control: { type: Boolean },
    autoHideControl: { type: Boolean, attribute: 'auto-hide-control' },
    showToggle: { type: Boolean, attribute: 'show-toggle' },

    src: { type: String, reflect: true },
    mute: { type: Boolean, reflect: true },
    locale: { type: String, reflect: true },
    aiSwitch: { type: String, reflect: true, attribute: 'ai-switch' },
    screenshotDirectory: { type: String, reflect: true, attribute: 'screenshot-directory' },
    screenshotFormat: { type: String, reflect: true, attribute: 'screenshot-format' },
    onlineDetection: { type: Boolean, reflect: true, attribute: 'online-detection' },
    hwaccel: { type: String, reflect: true },
    transport: { type: String, reflect: true },
    videoSync: { type: String, reflect: true, attribute: 'video-sync' },
    disableAudio: { type: Boolean, reflect: true, attribute: 'disable-audio' },

    path: { type: String, state: true },
    fileFormat: { type: String, state: true },
    fileSize: { type: Number, state: true },
    width: { type: Number, state: true },
    height: { type: Number, state: true },
    volume: { type: Number, state: true },
    speed: { type: Number, state: true },
    fps: { type: Number, state: true },
    drops: { type: Number, state: true },
    pause: { type: Boolean, state: true },
    idle: { type: Boolean, state: true },
    playlistPos: { type: Number, state: true },
    playlist: { type: Array, state: true },
    timePos: { type: Number, state: true },
    duration: { type: Number, state: true },
    videoc: { type: String, state: true },
    audioc: { type: String, state: true },
    hwdec: { type: String, state: true },
    scrcpy: { type: String, state: true },
    live: { type: String, state: true },
    unauthed: { type: Boolean, state: true },

    _loading: { type: Boolean, state: true },
    _hideControl: { type: Boolean, state: true },
    _crop: { type: Object, state: true },
    _zooming: { type: Boolean, state: true },
  }

  _readyResolvers = []
  _mpv = null
  _fullscreen = false
  _keyEnabled = false

  constructor () {
    super()
    updateWhenLocaleChanges(this)

    this.enableKey = false
    this.enableCrop = false
    this.showInfo = false
    this.control = false
    this.autoHideControl = true
    this.showToggle = true

    this.src = ''
    this.locale = ''
    this.aiSwitch = ''
    this.screenshotDirectory = ''
    this.screenshotFormat = ''
    this.onlineDetection = false
    this.hwaccel = 'auto'
    this.transport = ''
    this.videoSync = ''
    this.disableAudio = false
  
    this.volume = 100
    this.mute = false
    this.speed = 1.0
    this.pause = false
    this.path = ''
    this.fileFormat = ''
    this.fileSize = 0
    this.width = 0
    this.height = 0
    this.fps = 0
    this.drops = 0
    this.idle = true
    this.playlistPos = -1
    this.playlist = []
    this.timePos = 0
    this.duration = 0
    this.videoc = ''
    this.audioc = ''
    this.hwdec = ''
    this.scrcpy = false
    this.live = false
    this.unauthed = false
  
    this._loading = false
    this._hideControl = true

    this._autoHiderHandler = new AutoHideHandler(this)

    this._zoomingState = 0
    this._zoomStartX = 0
    this._zoomStartY = 0
    this._isDrawing = false
    this._crop = null
    this._zooming = false
  }

  async attributeChangedCallback (name, _old, value) {
    super.attributeChangedCallback(name, _old, value)

    switch (name) {
      case 'enable-key': {
        if (value == null || value === 'false') {
          if (this._keyEnabled) {
            document.removeEventListener('keydown', this._onKeyDown, false)
            document.removeEventListener('keyup', this._onKeyUp, false)
            this._keyEnabled = false
          }
        } else {
          if (!this._keyEnabled) {
            document.addEventListener('keydown', this._onKeyDown, false)
            document.addEventListener('keyup', this._onKeyUp, false)
            this._keyEnabled = true
          }
        }
        break
      }

      case 'src': {
        if (_old && !value) {
          this.stop()
        }
        if (value) {
          const url = decodeURIComponent(value)
          this.load(url)
        }
        break
      }

      case 'mute': {
        const mute = value != null && value !== 'false'
        this.property('mute', mute)
        break
      }

      case 'locale':
        await this._whenMpvReady()
        this._updateAISwitchAndLocale(null, value)
        break;

      case 'ai-switch':
        await this._whenMpvReady()
        this._updateAISwitchAndLocale(value, null)
        this._controlBar.aiSwitch = this.aiSwitch
        break;

      case 'online-detection':
        await this._whenMpvReady()
        this._updateLocalDetection()
        break

      case 'screenshot-directory': {
        if (value) {
          this.option('screenshot-directory', value)
        }
        break
      }
  
      case 'screenshot-format':
        if (value) {
          this.option('screenshot-format', value)
        }
        break
  
      case 'hwaccel':
        if (value != null) {
          if (value === 'none' || !value) {
            this.option('hwdec', 'no')
          } else {
            this.option('hwdec', 'auto')
          }
        }
        break

      case 'video-sync':
        if (value) {
          await this._whenMpvReady()
          this._mpv.profileSync(value)
        }
        break

      case 'transport':
        if (value) {
          this.option('rtsp-transport', value)
        }
        break
        
      case 'disable-audio':
        this.option('audio', value != null && value !== 'false' ? 'no' : 'auto')
        break
    }
  }

  connectedCallback () {
    super.connectedCallback()

    this.addEventListener('webkitfullscreenchange', () => {
      this._fullscreen = !!document.fullscreenElement
      this._controlBar.fullscreen = this._fullscreen
    })

    this.addEventListener('mousemove', () => {
      this._autoHiderHandler.start()
    })
  }

  disconnectedCallback () {
    if (this._keyEnabled) {
      document.removeEventListener('keydown', this._onKeyDown, false)
      document.removeEventListener('keyup', this._onKeyUp, false)
    }

    this.stop()

    super.disconnectedCallback()
  }

  firstUpdated () {
    this._controlBar = this.renderRoot.querySelector('x-control-bar')
    this._autoHiderHandler.start()
  }

  render () {
    const cropStyle = this._crop == null ? { display: 'none' } : { 
      left: this._crop.left + 'px',
      top: this._crop.top + 'px',
      width: this._crop.width + 'px',
      height: this._crop.height + 'px',
    }

    return html`
    <div 
      class="video-wrap" style=${styleMap({ cursor: this._hideControl ? 'none' : 'auto' })}
      @mousedown=${this._cropMousedown}
      @mousemove=${this._cropMousemove}
      @mouseup=${this._cropMouseup}
    >
      <embed type="application/x-player" @message=${this._handleMessage} />

      <span 
        class=${classMap({ 'bezel-play-icon': true, hide: this._hideControl && !this.idle && !this.pause })}
        style=${styleMap({ display: this.playlist.length > 0 && !this.scrcpy && !this._crop && this.showToggle ? null : 'none' })}
        @click=${this._handleTogglePlay}
      >
        <x-icon name=${playIcon(this)} size="36" style="color: white;"></x-icon>
      </span>

      <div class="player-crop-selection" style=${styleMap(cropStyle)} ></div>
    </div>

    <x-control-bar
      style=${styleMap({ display: this.control ? null : 'none' })}
      class=${classMap({ hide: this._hideControl })}
      @src-change=${this._handleSrcChange}
      @toggle-fullscreen=${this._handleToggleFullscreen}
      @toggle-play=${this._handleTogglePlay}
      @prev-frame=${this._handlePrevFrame}
      @next-frame=${this._handleNextFrame}
      @repeat-mode=${this._handleRepeatMode}
      @timepos-change=${this._handleTimeposChange}
      @volume-change=${this._handleVolumeChange}
      @mute-change=${this._handleMuteChange}
      @speed-change=${this._handleSpeedChange}
      @toggle-info=${this._handleToggleInfo}
      @toggle-local-detection=${this._handleToggleLocalDetection}
      @mouseenter=${this._enterControlBar}
      @mouseleave=${this._leaveControlBar}
    >
    </x-control-bar>

    <x-media-info 
      ?hidden=${!this.showInfo}
      path=${this.path}
      format=${this.fileFormat}
      size=${this.fileSize}
      width=${this.width}
      height=${this.height}
      fps=${this.fps}
      drops=${this.drops}
      duration=${this.duration}
      videoc=${this.videoc}
      audioc=${this.audioc}
      hwdec=${this.hwdec}
      sync=${this.videoSync}
      @toggle-info=${this._handleToggleInfo}>
    </x-media-info>

    <x-notice>
    </x-notice>

    <x-loading style=${styleMap({ display: this._loading ? undefined : 'none' })}></x-loading>

    <div class="player-status">
      <span 
        class="player-cancel-zoom"
        style=${styleMap({ display: this._zooming ? null : 'none' })}
        @click=${() => this.crop(null)}
      >
        <x-icon name="arrow-expand" size="16"></x-icon>
        ${i18n.t('video.zoom_reset')}
      </span>
      <span class="player-speed"
        style=${styleMap({ display: this.speed === 1 ? 'none' : null})}
        @click=${() => this.property('speed', 1)}
      >
        <x-icon name="fast-forward" size="16"></x-icon> ${this.speed}
      </span>
    </div>

    <slot></slot>
    `
  }

  // Methods
  async load (...args) {
    await this._whenMpvReady()
    return this._mpv.load(...args)
  }

  screenshot (...args) {
    if (args[0] !== false) {
      let { each, subtitles } = (args[0] || {})

      if (this._controlBar.screenshotting) {
        each = true
      }
  
      if (each) {
        this._controlBar.screenshotting = !this._controlBar.screenshotting
      }
      
      return this.command('osd-auto', 'screenshot', (each ? 'each-frame+' : '') + (subtitles ? 'subtitles' : 'video'))
    }
  }

  async togglePlay (...args) {
    await this._whenMpvReady()
    return this._mpv.togglePlay(...args)
  }

  async property (...args) {
    await this._whenMpvReady()
    return this._mpv.property(...args)
  }

  async option (...args) {
    await this._whenMpvReady()
    return this._mpv.option(...args)
  }

  async command (...args) {
    await this._whenMpvReady()
    return this._mpv.command(...args)
  }

  seekPercent (target) {
    return this.seek(target, 'absolute-percent')
  }

  seek (target, flag = 'relative') {
    return this.command('seek', target, flag, 'exact')
  }

  stop () {
    if (this._mpv) {
      this._mpv.property('playlist-pos', -1)
    }
  }

  crop (rect) {
    if (this._mpv && (!rect || !this.idle)) {
      this._mpv.crop(rect)
      this._zooming = !!rect
      this.dispatchEvent(new CustomEvent('prop-change', { detail: { name: 'zooming', value: !!rect }, bubbles: true, composed: true, }))
    }
  }

  _handleMessage (e) {
    if (e.data && e.data.type === 'ready') {
      if (e.data.data) {
        this._mpv = new MpvClient(e.target)
        this._mpvInit()
  
        this._readyResolvers.forEach(([resolve]) => resolve())
      } else {
        this._readyResolvers.forEach(([, reject]) => reject(new Error('load plugin fail')))
      }

      this._readyResolvers = null
      return
    }

    if (this._mpv) {
      const ev = e.data

      this._mpv.onMessage(ev)
  
      if (dispatchEvents.indexOf(ev.event >= 0)) {
        this.dispatchEvent(new CustomEvent(ev.event, { detail: ev, bubbles: true, composed: true, }))
      }
    }
  }

  _onPropertyChangeDefault (name, value) {
    switch (name) {
      case 'metadata': {
        // scrcpy return a tcp/websocket server port
        // client connect this port to send control message to scrcpy
        if (value?.['scrcpy_control_port']) {
          const port = parseInt(value['scrcpy_control_port'])
          const ws = new WebSocket(`ws://127.0.0.1:${port}`)
  
          ws.addEventListener('error', () => {
            this._closeScrcpy()
          })
          ws.addEventListener('open', () => {
            this._scrcpyClient = new ControlClient(ws, this._mpv._props, this._mpv.$el)
            this.scrcpy = true
            this._controlBar.scrcpy = true
            this._autoHiderHandler.stop()
            this._updateLocalDetection()
            this.dispatchEvent(new CustomEvent('scrcpy-connect', { detail: this._scrcpyClient, bubbles: true, composed: true }))
          })
        }
        break
      }

      case 'idle-active':
        this.idle = value
        this._controlBar.idle = value
        this._zoomingState = 0
        this._crop = null
        break

      case 'playlist-pos':
        this.playlistPos = value
        break

      case 'file-format':
        this.fileFormat = value
        this.live = value === 'rtsp' || value === 'scrcpy'
        this._controlBar.live = this.live
        break
        
      case 'time-pos':
        this.timePos = value
        this._controlBar.timePos = value
        break

      case 'file-size':
        this.fileSize = value
        break

      case 'estimated-vf-fps':
        this.fps = value
        break
          
      case 'video-codec':
        this.videoc = value
        break

      case 'audio-codec-name':
        this.audioc = value
        break

      case 'hwdec-current':
        this.hwdec = value
        break

      default: {
        if (name in XVideo.properties) {
          this[name] = value
        }
  
        if (name in XControlBar.properties) {
          this._controlBar[name] = value
        }
        break
      }
    }
  }

  _onKeyDown = (e) => {
    e.preventDefault()

    if (e.key === 'f' || (e.key === 'Escape' && this._fullscreen)) {
      this._toggleFullscreen()
    }

    if (this._scrcpyClient) {
      this._scrcpyClient.onKey(e)
      return
    }

    if (this._mpv) {
      this._mpv.onKeypress(e)
    }
  }

  _onKeyUp = (e) => {
    e.preventDefault();

    if (this._scrcpyClient) {
      this._scrcpyClient.onKey(e)
      return
    }
  
    if (this._mpv) {
      this._mpv.onKeypress(e)
    }
  }

  _updateAISwitchAndLocale (_aiSwitch, _locale) {
    const aiSwitch = _aiSwitch === null ? this.aiSwitch : _aiSwitch
    const locale = _locale === null ? this.locale : _locale

    if (aiSwitch === null) {
      return
    }

    if (!aiSwitch) {
      this._mpv.option('sub-visibility', false)
    } else {
      this._mpv.option('sub-visibility', true)
      if (locale === null) {
        this._mpv.option('sub-ass-styles', `${aiSwitch}`)
      } else {
        // include ai locale
        this._mpv.option('sub-ass-styles', `${aiSwitch},|${locale}`)
      }
    }
  }

  _handleSrcChange (e) {
    e.stopPropagation()
    this.src = e.detail
  }

  _handleToggleFullscreen (e) {
    e.stopPropagation()
    this._toggleFullscreen()
  }

  _toggleFullscreen () {
    if (!this._fullscreen) {
      if (this._mpv) {
        this.webkitRequestFullscreen()
      }
    } else {
      document.webkitExitFullscreen()
    }
  }

  _handleTogglePlay (e) {
    e.stopPropagation()
    this.togglePlay()
  }

  _handlePrevFrame (e) {
    e.stopPropagation()
    this.command('frame-back-step')
  }

  _handleNextFrame (e) {
    e.stopPropagation()
    this.command('frame-step')
  }

  _handleRepeatMode (e) {
    e.stopPropagation()
    if (this._mpv) {
      if (e.detail === 0) {
        this._mpv.option('loop-file', 'no');
        this._mpv.option('loop-playlist', 'no');
      } else if (e.detail === 1) {
        this._mpv.option('loop-file', 'inf');
      } else if (e.detail === 2) {
        this._mpv.option('loop-file', 'no');
        this._mpv.option('loop-playlist', 'inf');
      }
    }
  }

  _handleToggleLocalDetection (e) {
    e.stopPropagation()
    this.onlineDetection = !this.onlineDetection
  }

  _handleToggleInfo (e) {
    e.stopPropagation()
    this.showInfo = !this.showInfo
  }

  _handleTimeposChange (e) {
    e.stopPropagation()
    this.seekPercent(e.detail)
  }

  _handleVolumeChange (e) {
    e.stopPropagation()
    if (this._mpv) {
      const vol = e.detail
      this._mpv.property('volume', vol)
      this.renderRoot.querySelector('x-notice').show(`${i18n.t('volume')} ${vol}%`)
    }
  }

  _handleMuteChange (e) {
    e.stopPropagation()
    this.mute = e.detail
  }

  _handleSpeedChange (e) {
    e.stopPropagation()
    this._mpv.property('speed', e.detail)
  }

  _mpvInit () {
    this._mpv.registerEventHandler('property-change', e => {
      if (e.data === undefined) {
        return
      }

      if (!e.error) {
        this._onPropertyChangeDefault(e.name, e.data)

        if (e.id === undefined) {
          this.dispatchEvent(new CustomEvent('prop-change', { detail: { name: e.name, value: e.data }, bubbles: true, composed: true, }))
        }
      }
    })

    this._mpv.registerEventHandler('start-file', () => {
      this._loading = true
      this._controlBar.screenshotting = false
      this.unauthed = false
    })

    this._mpv.registerEventHandler('end-file', () => {
      this._loading = false
      this._controlBar.screenshotting = false
      this._closeScrcpy()
    })

    this._mpv.registerEventHandler('file-loaded', () => {
      this._loading = false
    })

    this._mpv.addHook('on_load_fail', 0, async ({ defer, cont }) => {
      const path = this.path
      const parts = parseURL(path)

      if (parts?.protocol === 'rtsp') {
        if (this._mpv._props['options/demuxer-lavf-hacks'] === 2) {
          this.unauthed = true
          const event = new CustomEvent('auth-required', { detail: {}, bubbles: true, composed: true, cancelable: true })
          event.detail.username = parts.username
          event.detail.password = parts.password
          event.detail.path = path
          event.detail.callback = (cancelled, username, password) => {
            if (!cancelled && (parts.username !== username || parts.password !== password)) {
              // wait some time for play end
              setTimeout(() => { this._mpv.load(path, 'replace', { 'demuxer-lavf-hacks': 1, username, password }) }, 100)
            }
          }
          this.dispatchEvent(event)

          if (event.defaultPrevented) {
            cont()
            return
          }
        }
      }

      cont()
    })
  }

  async _whenMpvReady () {
    return new Promise((resolve, reject) => {
      if (this._readyResolvers === null) {
        if (this._mpv) {
          return resolve()
        } else {
          return reject(new Error('load plugin failed'))
        }
      }

      this._readyResolvers.push([resolve, reject])
    })
  }

  _closeScrcpy () {
    if (this._scrcpyClient) {
      this._scrcpyClient.close()
      this._scrcpyClient = null
      this.scrcpy = false
      this._controlBar.scrcpy = false
      this._autoHiderHandler.start()
      this._updateLocalDetection()

      this.dispatchEvent(new Event('scrcpy-disconnect', { bubbles: true, composed: true }))
    }
  }

  _enterControlBar () {
    this._onControlBar = true
    this._autoHiderHandler.stop()
  }

  _leaveControlBar () {
    this._onControlBar = false
    this._autoHiderHandler.start()
  }

  _updateLocalDetection () {
    const on = this.onlineDetection && !this.scrcpy
    this._mpv.option('hot-detection', on)
    this._controlBar.localDetection = on

    for (const t of this._mpv._props['track-list']) {
      if (on) {
        if (t.codec === 'eia_608') {
          if (!t.selected) {
            this.option('sid', t.id)
          }
          break
        }
      } else {
        // user cancelled local-detection
        // set default ai sid back (if presents)
        if (t.codec === 'ass_ai') {
          if (!t.selected) {
            this.option('sid', t.id)
          }
          break
        }
      }
    }
  }

  _cropMousedown (e) {
    if (e.button === 0 && this.enableCrop) {
      e.preventDefault();
      this._zoomingState = 1
      this._zoomStartX = e.offsetX
      this._zoomStartY = e.offsetY
    }
  }

  _cropMousemove (e) {
    if (this._zoomingState !== 1) {
      return
    }
    let x = e.offsetX
    let y = e.offsetY
    const x0 = Math.min(this._zoomStartX, x)
    const y0 = Math.min(this._zoomStartY, y)
    const x1 = Math.max(this._zoomStartX, x)
    const y1 = Math.max(this._zoomStartY, y)
    const w = Math.abs(x1 - x0)
    const h = Math.abs(y1 - y0)
  
    if (w > 10 && h > 10) {
      this._crop = { left: x0, top: y0, width: w, height: h }
    } else {
      this._crop = null
    }
  }

  _cropMouseup (e) {
    if (e.button === 0) {
      e.preventDefault();
      this._zoomingState = 0
      if (this._crop != null) {
        e.stopPropagation();

        this.crop(this._crop)
        this._crop = null
        this._isDrawing = true
        setTimeout(() => {
          this._isDrawing = false
        }, 300)
        return false
      }
    }
  }
}

customElements.define('x-video', XVideo)

class AutoHideHandler {
  constructor (host) {
    this.host = host
  }

  shouldAutoHide () {
    // disable auto hide in scrcpy mode
    // since scrcpy will disable mouse event on video wrap
    return this.host.control && this.host.autoHideControl && !this.host.scrcpy && !this.host._onControlBar
  }

  start () {
    if (this.shouldAutoHide()) {
      this.stop()

      this._timer = setTimeout(() => {
        this._timer = null
        this.host._hideControl = true
      }, 2000)
    }
  }

  stop () {
    this.host._hideControl = false

    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
  }
}

function playIcon (host) {
  if (host.idle) {
    if (host.unauthed) {
      return 'account-lock'
    }

    return host.live ? 'link-off' : 'replay'
  } else {
    return host.pause ? 'play' : 'pause'
  }
}
