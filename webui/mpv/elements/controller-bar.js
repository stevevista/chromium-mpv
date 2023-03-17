import { LitElement, css, html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { classMap } from 'lit/directives/class-map.js'
import './btn'
import './play-bar'
import './volume-ctrl'
import './stacked-btn'
import { formatSeconds } from './utils'

const allSpeeds = [1, 2, 4]

export default class XControllerBar extends LitElement {
  static styles = css`
  :host {
    display: flex;
    height: 40px;
    user-select: none;
    transition: all 0.3s ease;
  }

  .spacer {
    flex: 1;
  }

  .hidden {
    display: none;
  }

  x-btn {
    padding: 0 6px;
  }

  .play-time {
    line-height: 38px;
    color: #eee;
    text-shadow: 0 0 2px rgba(0, 0, 0, .5);
    vertical-align: middle;
    font-size: 13px;
    cursor: default;
  }

  x-play-bar {
    padding: 15px 0;
    position: absolute;
    bottom: 33px;
  }
  `

  static properties = {
    _barWidth: { type: Number, state: true },
    pause: { type: Boolean },
    idle: { type: Boolean },
    playlistCount: { type: Number },
    timePos: { type: Number },
    duration: { type: Number },
    mute: { type: Boolean, reflect: true },
    volume: { type: Number, reflect: true },
    fullscreen: { type: Boolean, reflect: true },
    speed: { type: Number, reflect: true },
  }

  constructor () {
    super()

    this._barWidth = 0
    this.pause = false
    this.idle = true
    this.playlistCount = 0
    this.timePos = 0
    this.duration = 0
    this.mute = 0
    this.volume = 100
    this.fullscreen = false
    this.speed = 1.0
  }

  connectedCallback () {
    super.connectedCallback();
    window.addEventListener('resize', this._handleResize)
  }

  disconnectedCallback () {
    window.removeEventListener('resize', this._handleResize);
    super.disconnectedCallback();
  }

  firstUpdated () {
    this._barWidth = this.offsetWidth
  }

  render () {
    const formattedTimePos = formatSeconds(this.timePos)
    const formattedDuration = formatSeconds(this.duration)

    return html`
      <x-stacked-btn>
        <x-btn slot="default"
          icon="folder-open" color="black" size="24" icon-only
          @click=${this.openFiles}
          title=""
        ></x-btn>
        <x-btn 
          icon="link-variant" color="black" size="24" icon-only
        ></x-btn>
      </x-stacked-btn>

      <x-btn 
        icon="${this.idle ? 'replay' : (this.pause ? 'play' : 'pause')}" color="black" size="24" icon-only
        ?hidden=${this._barWidth < 400}
        ?disabled=${this.playlistCount === 0}
        @click=${this.togglePlay}
      ></x-btn>

      <x-stacked-btn ?hidden=${this._barWidth < 400}>
        <x-btn slot="default"
          color="black" size="24" icon-only
        >x ${this.speed}</x-btn>
        ${allSpeeds.filter(i => i !== this.speed).map((i) =>
          html`
          <x-btn 
            color="black" size="24" icon-only
            @click=${() => this.toggleSpeed(i)}
          >x ${i}</x-btn>`
          )}
      </x-stacked-btn>

      <x-volume-ctrl ?mute=${this.mute} volume=${this.volume}>
      </x-volume-ctrl>

      <span class="play-time">${formattedTimePos} / ${formattedDuration}</span>

      <div class="spacer"></div>

      <x-btn 
        icon="information-outline" color="black" size="24" icon-only
        ?hidden=${this._barWidth < 400}
        @click=${this.toggleInfo}
      ></x-btn>
      <x-btn 
        icon="camera" color="black" size="24" icon-only
        ?hidden=${this._barWidth < 400}
      ></x-btn>
      <x-btn 
        icon="crop-free" color="black" size="24" icon-only
        @click=${this.toggleFullscreen}
      ></x-btn>

      <x-play-bar ?idle=${this.idle} timePos=${this.timePos} duration=${this.duration}>
      </x-play-bar>
    `
  }

  async openFiles () {
    const event = new Event('open-file', { bubbles: true, composed: true, cancelable: true, })
    this.dispatchEvent(event)
  }

  togglePlay () {
    this.dispatchEvent(new Event('toggle-play', { bubbles: true, composed: true, }))
  }

  toggleFullscreen () {
    this.dispatchEvent(new Event('toggle-fullscreen', { bubbles: true, composed: true, }))
  }

  toggleSpeed (detail) {
    this.dispatchEvent(new CustomEvent('speed-change', { detail, bubbles: true, composed: true, }))
  }

  toggleInfo () {
    this.dispatchEvent(new Event('toggle-info', { bubbles: true, composed: true, }))
  }

  _handleResize = () => {
    if (this.offsetWidth !== 0) {
      this._barWidth = this.offsetWidth
    }
  }
}

customElements.define('x-controller-bar', XControllerBar)
