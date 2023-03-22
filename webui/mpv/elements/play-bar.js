import { LitElement, css, html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { formatSeconds, getBoundingClientRectViewLeft } from './utils'

const duration_fix_delta = 2
const duration_fix_thres = 15

export default class XPlayBar extends LitElement {
  static styles = css`
  :host {
    cursor: pointer;
    height: 3px;
    width: calc(100% - 40px);
    pointer-events: all;
  }

  :host([hidden]) {
    display: none !important;
  }

  .bar {
    position: relative;
    height: 3px;
    width: 100%;
    background: rgba(255, 255, 255, .2);
    cursor: pointer;
  }

  .bar .played {
    background: #b7daff;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    height: 3px;
    will-change: width;
  }

  .bar .played .thumb {
    position: absolute;
    top: 0;
    right: 5px;
    margin-top: -4px;
    margin-right: -10px;
    height: 11px;
    width: 11px;
    border-radius: 50%;
    cursor: pointer;
    transition: all .3s ease-in-out;
    transform: scale(0);
    background: #b7daff;
  }

  :host(:hover) .bar .played .thumb {
    transform: scale(1);
  }

  .bar-time {
    position: absolute;
    left: 0px;
    top: -20px;
    border-radius: 4px;
    padding: 5px 7px;
    background-color: rgba(0, 0, 0, 0.62);
    color: #fff;
    font-size: 12px;
    text-align: center;
    opacity: 1;
    transition: opacity .1s ease-in-out;
    word-wrap: normal;
    word-break: normal;
    z-index: 2;
    pointer-events: none;
  }
  `

  static properties = {
    idle: { type: Boolean },
    timePos: { type: Number },
    duration: { type: Number },
    _showTimeAnchor: { type: Boolean, state: true },
  }

  constructor () {
    super()

    this.idle = true
    this.timePos = 0
    this.duration = 0
    this._showTimeAnchor = false

    this.addEventListener('mousedown', () => {
      if (this.idle) {
        return
      }
      document.addEventListener('mousemove', this.thumbMove);
      document.addEventListener('mouseup', this.thumbUp);
    })

    this.addEventListener('mousemove', (e) => {
      if (this.duration > 0) {
        const px = e.target.getBoundingClientRect().left;
        const tx = (e.clientX || e.changedTouches[0].clientX) - px;
        if (tx < 0 || tx > e.target.offsetWidth) {
          return;
        }
        const playedBarTimeEl = this.renderRoot.querySelector('.bar-time')
        const time = this.duration * (tx / e.target.offsetWidth);
        playedBarTimeEl.style.left = `${tx - (time >= 3600 ? 25 : 20)}px`;
        playedBarTimeEl.innerText = formatSeconds(time);
        this._showTimeAnchor = true
      }
    })

    this.addEventListener('mouseenter', (e) => {
      this._showTimeAnchor = true
    })

    this.addEventListener('mouseleave', (e) => {
      this._showTimeAnchor = false
    })
  }

  render () {
    const playedPercentage = ((this.duration > 0 ? (this.timePos + (this.duration > duration_fix_thres ? duration_fix_delta : 0) >= this.duration ? 1 : this.timePos / this.duration) : 0) * 100)

    return html`
      <div class="bar-time" style=${styleMap({ opacity: this.duration <= 0 || !this._showTimeAnchor ? 0 : 1 })}>00:00</div>

      <div class="bar">
        <div class="played" style=${styleMap({ width: `${playedPercentage}%` })}>
          <span class="thumb"></span>
        </div>
      </div>
    `
  }

  thumbMove = (e) => {
    if (this.duration > 0) {
      this.timePos = this.calcMouseTimePercentage(e) * this.duration
    }
  }

  thumbUp = (e) => {
    document.removeEventListener('mouseup', this.thumbUp)
    document.removeEventListener('mousemove', this.thumbMove)

    const detail = this.calcMouseTimePercentage(e) * 100
    this.dispatchEvent(new CustomEvent('timepos-change', { detail, bubbles: true, composed: true, }))
  }

  calcMouseTimePercentage (e) {
    const root = this.renderRoot.querySelector('.bar')
    let percentage = ((e.clientX || e.changedTouches[0].clientX) - getBoundingClientRectViewLeft(root)) / root.clientWidth;
    percentage = Math.max(percentage, 0)
    percentage = Math.min(percentage, 1)
    
    return percentage
  }
}

customElements.define('x-play-bar', XPlayBar)
