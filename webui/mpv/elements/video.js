import { LitElement, css, html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { classMap } from 'lit/directives/class-map.js'
import './controller-bar'
import './loading'
import './media-info'
import './notice'
import MpvClient from './mpv-client'
import i18n from '../i18n'

// Styles and controls copy from https://github.com/DIYgod/DPlayer

const dispatchEvents = [
  'start-file',
  'end-file',
  'file-loaded',
]

export default class XVideo extends LitElement {
  static styles = css`
  :host {
    position: relative;
    display: block;
    background-color: #000;
  }

  .hidden {
    display: none;
  }

  x-controller-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0 20px;
    transition: all .3s ease-in-out;
  }

  x-controller-bar.hide {
    display: none;
  }

  .video-wrap {
    width: 100%;
    height: 100%
  }

  .video-wrap embed {
    pointer-events:none; 
    display: block;
    width: 100%;
    height: 100%
  }

  x-media-info {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 400px;
  }
  `

  static shadowRootOptions = { mode: 'closed' }

  static properties = {
    control: { type: Boolean },
    autoHideControl: { type: Boolean, attribute: 'auto-hide-control' },
    enableKey: { type: Boolean, attribute: 'enable-key' },
    showInfo: { type: String, reflect: true, attribute: 'show-info' },
    src: { type: String, reflect: true },
    volume: { type: Number, reflect: true },
    mute: { type: Boolean, reflect: true },
    speed: { type: Number, reflect: true },
  
    path: { type: String, state: true },
    fileFormat: { type: String, state: true },
    fileSize: { type: Number, state: true },
    width: { type: Number, state: true },
    height: { type: Number, state: true },
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

    _loading: { type: Boolean, state: true },
    _fullscreen: { type: Boolean, state: true },
    _hideControl: { type: Boolean, state: true },
  }

  constructor () {
    super()
    this.control = false
    this.autoHideControl = true
    this.enableKey = false
    this.showInfo = false
    this.src = ''
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
  
    this._fullscreen = false
    this._hideControl = false
    this._loading = false

    this._mpv = null
    this._readyResolvers = []
  }

  async attributeChangedCallback (name, _old, value) {
    super.attributeChangedCallback(name, _old, value)

    switch (name) {
      case 'src':
        await this._mpvReady()
        if (_old && !value) {
          this._mpv.stop()
        }
        if (value) {
          const url = decodeURIComponent(value)
          this._mpv.load(url)
        }
        break

      case 'volume': {
        await this._mpvReady()
        const vol = parseInt(value)
        if (!isNaN(vol)) {
          this._mpv.property('volume', vol)
          if (_old != null) {
            this.renderRoot.querySelector('x-notice').show(`${i18n.t('volume')} ${vol}%`)
          }
        }
        break
      }

      case 'mute': {
        const mute = value != null
        await this._mpvReady()
        this._mpv.property('mute', mute)
        break
      }

      case 'screenshot-directory': {
        if (value) {
          await this._mpvReady()
          this._mpv.option('screenshot-directory', value)
        }
        break
      }

      case 'screenshot-format':
        if (value) {
          await this._mpvReady()
          this._mpv.option('screenshot-format', value)
        }
        break

      case 'hwaccel':
        if (value != null) {
          await this._mpvReady()
          if (value === 'none' || !value) {
            this._mpv.option('hwdec', 'no')
          } else {
            this._mpv.option('hwdec', 'auto')
          }
        }
        break
    }
  }

  connectedCallback () {
    super.connectedCallback()

    this.addEventListener('webkitfullscreenchange', () => {
      this._fullscreen = !!document.fullscreenElement
    })

    this.addEventListener('mousemove', () => {
      if (this.autoHideControl) {
        if (this._hideTimer) {
          clearTimeout(this._hideTimer)
          this._hideTimer = null
        }

        this._hideControl = false

        if (!this._onControlBar) {
          this._hideTimer = setTimeout(() => {
            this._hideTimer = null
            this._hideControl = true
          }, 2000)
        }
      }
    })

    document.addEventListener('keydown', this._onKeyDown, false)
  }

  disconnectedCallback () {
    document.removeEventListener('keydown', this._onKeyDown, false)

    if (this._mpv) {
      this._mpv.stop()
    }
    super.disconnectedCallback();
  }

  render () {
    return html`
    <div class="video-wrap" style=${styleMap({ cursor: this._hideControl ? 'none' : 'auto' })}>
      <embed type="application/x-player" @message=${this._handleMessage} />
    </div>
  
    <x-controller-bar
      style=${styleMap(this.control ? {} : { display: 'none' })}
      class=${classMap({ 'hide': this._hideControl })}
      ?pause=${this.pause}
      ?idle=${this.idle}
      timePos=${this.timePos}
      duration=${this.duration}
      playlistCount=${this.playlist.length}
      ?mute=${this.mute}
      volume=${this.volume}
      speed=${this.speed}
      @src-change=${this._handleSrcChange}
      @toggle-play=${this._handleTogglePlay}
      @toggle-fullscreen=${this._handleToggleFullscreen}
      @timepos-change=${this._handleTimeposChange}
      @volume-change=${this._handleVolumeChange}
      @mute-change=${this._handleMuteChange}
      @speed-change=${this._handleSpeedChange}
      @toggle-info=${this._handleToggleInfo}
      @mouseenter=${this._enterControlBar}
      @mouseleave=${this._leaveControlBar}
    >
    </x-controller-bar>

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
      @toggle-info=${this._handleToggleInfo}>
    </x-media-info>

    <x-notice>
    </x-notice>

    <x-loading style=${styleMap({ display: this._loading ? undefined : 'none' })}></x-loading>
    `
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
      this._mpv.handleMessage(e)

      const ev = e.data
      if (dispatchEvents.indexOf(ev.event >= 0)) {
        this.dispatchEvent(new CustomEvent(ev.event, { detail: ev, bubbles: true, composed: true, }))
      }
    }
  }

  _handleSrcChange (e) {
    e.stopPropagation()
    this.src = e.detail
  }

  async _handleTogglePlay (e) {
    e.stopPropagation()
    await this._mpvReady()
    this._mpv.togglePlay()
  }

  _handleToggleFullscreen (e) {
    e.stopPropagation()
    this._toggleFullscreen()
  }

  _handleToggleInfo (e) {
    e.stopPropagation()
    this.showInfo = !this.showInfo
  }

  _toggleFullscreen () {
    if (!this._fullscreen) {
      if (this._mpv)
        this.webkitRequestFullscreen()
    } else {
      document.webkitExitFullscreen()
    }
  }

  _handleTimeposChange (e) {
    e.stopPropagation()
    this._mpv.seekPercent(e.detail)
  }

  _handleVolumeChange (e) {
    e.stopPropagation()
    this.volume = e.detail
  }

  _handleMuteChange (e) {
    e.stopPropagation()
    this.mute = e.detail
  }

  _handleSpeedChange (e) {
    e.stopPropagation()
    this._mpv.property('speed', e.detail)
  }

  _onKeyDown = (e) => {
    e.preventDefault();

    if (e.key === 'f' || (e.key === 'Escape' && this._fullscreen)) {
      this._toggleFullscreen()
    } else {
      this._mpv.keypress(e)
    }
  }

  _enterControlBar () {
    this._onControlBar = true
    if (this._hideTimer) {
      clearTimeout(this._hideTimer)
      this._hideTimer = null
    }
  }

  _leaveControlBar () {
    this._onControlBar = false
  }

  async _mpvReady () {
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

  _mpvInit () {
    this._mpv.registerEvent('property-change', e => {
      if (e.data === undefined) {
        return
      }

      if (!e.error) {
        this._onPropertyChangeDefault(e.name, e.data)
      }

      if (e.id === undefined) {
        this.dispatchEvent(new CustomEvent('prop-change', { detail: e, bubbles: true, composed: true, }))
      }
    })

    this._mpv.registerEvent('start-file', () => {
      this._loading = true
    })

    this._mpv.registerEvent('end-file', () => {
      this._loading = false
    })

    this._mpv.registerEvent('file-loaded', () => {
      this._loading = false
    })
  }

  _onPropertyChangeDefault (name, value) {
    if (name in XVideo.properties) {
      this[name] = value
    } else {
      switch (name) {
        case 'idle-active':
          this.idle = value
          break
  
        case 'playlist-pos':
          this.playlistPos = value
          break
  
        case 'time-pos':
          this.timePos = value
          break

        case 'file-format':
          this.fileFormat = value
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
      }
    }
  }
}

customElements.define('x-video', XVideo)
