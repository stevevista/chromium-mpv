import { css, html, LitElement } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { updateWhenLocaleChanges } from './localized'
import './btn'
import './play-bar'
import './stacked-btn'
import './volume-ctrl'
import { formatSeconds } from './utils'
import i18n from '../i18n'

const aiSwitchsBtns = [
  {
    key: 'vehicle',
    icon: 'car-hatchback',
    tip: 'ai.vehicle',
  },
  {
    key: 'pedestrian',
    icon: 'human-male-boy',
    tip: 'ai.pedestrian',
  },
  {
    key: 'face',
    tip: 'ai.face',
    icon: 'face-man'
  },
  {
    key: 'car_detail',
    tip: 'ai.vehicle_rec',
    icon: 'car-hatchback',
    border: true
  },
  {
    key: 'pedestrian_detail',
    tip: 'ai.pedestrian_rec',
    icon: 'human-male-boy',
    border: true
  },
  {
    key: 'face_detail',
    tip: 'ai.face_rec',
    icon: 'face-man-shimmer-outline',
    border: true
  }
]

export default class XControlBar extends LitElement {
  static styles = css`
  :host {
    display: flex;
    height: 42px;
    user-select: none;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  :host :not(.spacer) {
    pointer-events: all;
  }

  .spacer {
    flex: 1;
  }

  x-btn {
    padding: 0 6px;
  }

  .play-time {
    line-height: 44px;
    color: #eee;
    text-shadow: 0 0 2px rgba(0, 0, 0, .5);
    vertical-align: middle;
    font-size: 13px;
    cursor: default;
    padding-left: 2px;
  }

  x-play-bar {
    padding: 15px 0;
    position: absolute;
    bottom: 33px;
  }
  `

  static properties = {
    _barWidth: { type: Number, state: true },
    pause: { type: Boolean, state: true },
    idle: { type: Boolean, state: true },
    playlist: { type: Array, state: true },
    timePos: { type: Number, state: true },
    duration: { type: Number, state: true },
    mute: { type: Boolean, state: true },
    volume: { type: Number, state: true },
    fullscreen: { type: Boolean, state: true },
    speed: { type: Number, state: true },
    scrcpy: { type: String, state: true },
    live: { type: String, state: true },
    repeat: { type: Number, state: true },
    screenshotting: { type: Boolean, state: true },
    aiSwitch: { type: String, state: true },
    localDetection: { type: Boolean, state: true },
  }

  constructor () {
    super()
    updateWhenLocaleChanges(this)
  
    this._barWidth = 0
    this.pause = false
    this.idle = true
    this.playlist = []
    this.timePos = 0
    this.duration = 0
    this.mute = 0
    this.volume = 100
    this.fullscreen = false
    this.speed = 1.0
    this.scrcpy = false
    this.live = false
    this.repeat = 0
    this.screenshotting = false
    this.aiSwitch = ''
    this.localDetection = false
  }

  connectedCallback () {
    super.connectedCallback();
    window.addEventListener('resize', this._handleResize)

    this.addEventListener('contextmenu', e => { e.stopPropagation() })
  }

  disconnectedCallback () {
    window.removeEventListener('resize', this._handleResize)
    super.disconnectedCallback();
  }

  firstUpdated () {
    this._barWidth = this.offsetWidth
  }

  render () {
    let repeatIcon

    if (this.repeat === 1) {
      repeatIcon = 'repeat-once'
    } else if (this.repeat === 2) {
      repeatIcon = 'repeat'
    } else if (this.repeat === 3) {
      repeatIcon = 'playlist-music'
    } else {
      repeatIcon = 'repeat-off'
    }

    const formattedTimePos = formatSeconds(this.timePos)
    const formattedDuration = formatSeconds(this.duration)

    const aiSwitchVect = this.aiSwitch.split(',')

    return html`
    <x-stacked-btn>
      <x-btn slot="default"
        icon="folder-open" color="black" size="24" icon-only
        @click=${this._openFile}
        title=""
      ></x-btn>
      <x-btn
        icon="file-multiple" color="black" size="24" icon-only
        @click=${this._openMultiple}
        title=${i18n.t('video.openDir')}
      ></x-btn>
      <x-btn
        icon="link-variant" color="black" size="24" icon-only
        @click=${this._openUrl}
        title=${i18n.t('video.openUrl')}
      ></x-btn>
    </x-stacked-btn>

    <x-btn
      icon=${this.idle ? 'replay' : (this.pause ? 'play' : 'pause')} color="black" size="24" icon-only
      ?hidden=${this._barWidth < 400 || this.scrcpy}
      ?disabled=${this.playlist.length === 0}
      @click=${this._togglePlay}
    ></x-btn>

    <x-btn
      icon="arrow-left-bold-box" color="black" size="24" icon-only
      ?hidden=${this._barWidth < 400 || this.live}
      ?disabled=${this.idle || this.playlist.length === 0}
      @click=${this._prevFrame}
      title=${i18n.t('prev_frame')}
    ></x-btn>

    <x-btn
      icon="arrow-right-bold-box" color="black" size="24" icon-only
      ?hidden=${this._barWidth < 400 || this.live}
      ?disabled=${this.idle || this.playlist.length === 0}
      @click=${this._nextFrame}
      title=${i18n.t('next_frame')}
    ></x-btn>

    <x-btn
      icon=${repeatIcon} color="black" size="24" icon-only
      ?hidden=${this._barWidth < 400}
      @click=${this._cycleRepeat}
      title=${i18n.t('video.' + repeatIcon)}
    ></x-btn>

    <x-volume-ctrl ?mute=${this.mute} volume=${this.volume} ?hidden=${this.scrcpy}>
    </x-volume-ctrl>

    <span class="play-time">${formattedTimePos} / ${formattedDuration}</span>

    <div class="spacer"></div>

    <x-btn 
      icon="information-outline" color="black" size="24" icon-only
      ?hidden=${this._barWidth < 400}
      @click=${this._toggleInfo}
      title=${i18n.t('video.info')}
    ></x-btn>

    <x-btn 
      icon="invert-colors" color="black" size="24" icon-only
      ?hidden=${this._barWidth < 400}
      @click=${this._toggleEqualizer}
      title=${i18n.t('equalizer')}
    ></x-btn>

    <x-btn 
      icon=${this.localDetection ? 'eye' : 'eye-off-outline'} color=${this.localDetection ? 'red' : 'black'} size="24" icon-only
      ?hidden=${this._barWidth < 400 || this.scrcpy}
      @click=${this._toggleLocalDetection}
      title=${i18n.t(this.localDetection ? 'trace_on' : 'trace_off')}
    ></x-btn>

    <x-stacked-btn
      ?hidden=${this._barWidth < 400 || this.scrcpy}
    >
      <x-btn slot="default"
        icon="face-recognition" color="black" size="24" icon-only
        title=${i18n.t('video.detection')}
      ></x-btn>
      ${aiSwitchsBtns.map(i => html`
        <x-btn
          icon=${i.icon} color=${aiSwitchVect.indexOf(i.key) >= 0 ? 'black' : 'gray'} size="24" icon-only
          style=${styleMap({ border: i.border ? 'dashed 1px white' : null })}
          @click=${(e) => this._toggleAiSwitch(e, i.key)}
          title=${i18n.t(i.tip)}
        ></x-btn>
      `)}
    </x-stacked-btn>
  
    <x-stacked-btn
      ?hidden=${this._barWidth < 400}
    >
      <x-btn slot="default"
        icon=${this.screenshotting ? 'camera-iris' : 'camera'} color="black" size="24" icon-only
        ?spin=${this.screenshotting}
        ?disabled=${this.idle}
        @click=${this._screenshot}
        title=${i18n.t(this.screenshotting ? 'video.snapshot_working' : 'video.snapshot')}
      ></x-btn>
      <x-btn
        icon="image-multiple" color="black" size="24" icon-only
        ?disabled=${this.idle || this.screenshotting}
        @click=${this._screenshotMultiple}
        title=${i18n.t('video.shot_each')}
      ></x-btn>
      <x-btn
        icon="cog" color="black" size="24" icon-only
        ?disabled=${this.screenshotting}
        @click=${this._screenshotSetting}
        title=${i18n.t('common.setting')}
      ></x-btn>
    </x-stacked-btn>

    <x-btn 
      icon=${this.fullscreen ? 'fullscreen-exit' : 'crop-free'} color="black" size="24" icon-only
      @click=${this._toggleFullscreen}
      title=${i18n.t('video.Full_screen')}
    ></x-btn>

    <x-play-bar ?hidden=${this.scrcpy} ?idle=${this.idle} timePos=${this.timePos} duration=${this.duration}>
    </x-play-bar>
    `
  }

  _openFile (e) {
    e.stopPropagation()
    const event = new Event('open-file', { bubbles: true, composed: true, cancelable: true, })
    this.dispatchEvent(event)
  }

  _openMultiple (e) {
    e.stopPropagation()
    const event = new Event('open-multiple', { bubbles: true, composed: true, cancelable: true, })
    this.dispatchEvent(event)
  }

  _openUrl (e) {
    e.stopPropagation()
    const event = new Event('open-url', { bubbles: true, composed: true, cancelable: true, })
    this.dispatchEvent(event)
    if (event.defaultPrevented) {
      return
    }
    const url = prompt("Input url")
    if (url) {
      this.dispatchEvent(new CustomEvent('src-change', { detail: url, bubbles: true, composed: true, }))
    }
  }

  _togglePlay (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('toggle-play', { bubbles: true, composed: true, }))
  }

  _prevFrame (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('prev-frame', { bubbles: true, composed: true, }))
  }

  _nextFrame (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('next-frame', { bubbles: true, composed: true, }))
  }

  _cycleRepeat (e) {
    e.stopPropagation()
  
    if (this.repeat >= 2) {
      this.repeat = 0;
    } else {
      this.repeat++
    }

    this.dispatchEvent(new CustomEvent('repeat-mode', { detail: this.repeat, bubbles: true, composed: true, }))
  }

  _toggleFullscreen (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('toggle-fullscreen', { bubbles: true, composed: true, }))
  }

  _screenshotSetting (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('screenshot-setting', { bubbles: true, composed: true, }))
  }

  _screenshotMultiple (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('screenshot-multiple', { bubbles: true, composed: true, }))
  }

  _screenshot (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('screenshot', { bubbles: true, composed: true, }))
  }

  _toggleInfo (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('toggle-info', { bubbles: true, composed: true, }))
  }

  _toggleAiSwitch (e, detail) {
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('toggle-ai-switch', { detail, bubbles: true, composed: true, }))
  }

  _toggleLocalDetection (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('toggle-local-detection', { bubbles: true, composed: true, }))
  }

  _toggleEqualizer (e) {
    e.stopPropagation()
    this.dispatchEvent(new Event('toggle-equalizer', { bubbles: true, composed: true, }))
  }

  _handleResize = () => {
    if (this.offsetWidth !== 0) {
      this._barWidth = this.offsetWidth
    }
  }
}

customElements.define('x-control-bar', XControlBar)
