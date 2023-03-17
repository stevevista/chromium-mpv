import { LitElement, css, html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { classMap } from 'lit/directives/class-map.js'
import './btn'
import './play-bar'
import './volume-ctrl'
import { getBoundingClientRectViewLeft } from './utils'

const vWidth = 35;

export default class XVolumeCtrl extends LitElement {
  static styles = css`
  :host {
    display: flex;
  }

  x-btn {
    padding: 0 6px;
  }

  .volume-bar-wrap {
    display: inline-flex;
    justify-content: center;
    height: 100%;
    align-items: center;
    padding-right: 6px;
  }

  .volume-bar-wrap .volume-bar {
    position: relative;
    width: 0px;
    height: 5px;
    background: #aaa;
    transition: all 0.3s ease-in-out;
  }

  .volume-bar-wrap .volume-bar .volume-bar-inner {
    background: #b7daff;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 100%;
    transition: all 0.1s ease;
    will-change: width;
  }

  .volume-bar-wrap .volume-bar .volume-bar-inner .volume-thumb {
    position: absolute;
    top: 0;
    right: 5px;
    margin-top: -4px;
    margin-right: -10px;
    height: 13px;
    width: 13px;
    border-radius: 50%;
    cursor: pointer;
    transition: all .3s ease-in-out;
    transform: scale(0);
    background: #b7daff;
  }

  :host(:hover) .volume-bar-wrap .volume-bar {
    width: 45px;
  }

  :host(:hover) .volume-bar-wrap .volume-bar .volume-bar-inner .volume-thumb {
    transform: scale(1);
  }
  `

  static properties = {
    mute: { type: Boolean, reflect: true },
    volume: { type: Number, reflect: true },
  }

  constructor () {
    super()

    this.mute = false
    this.volume = 100
  }

  render () {
    const volumeLength = this.mute ? 0 : this.volume

    let volumeIcon
    if (this.mute) {
      volumeIcon = 'volume-mute';
    } else if (this.volume >= 95) {
      volumeIcon = 'volume-high';
    } else if (this.volume > 50) {
      volumeIcon = 'volume-medium';
    } else {
      volumeIcon = 'volume-low';
    }
  
    return html`
      <x-btn 
        icon="${volumeIcon}" color="black" size="24" icon-only
        @click=${this.toggleMute}
      ></x-btn>

      <div class="volume-bar-wrap" @click=${this.handleClick} @mousedown=${this.mousedown}>
        <div class="volume-bar">
          <div class="volume-bar-inner" style=${styleMap({ width: `${volumeLength}%` })}>
            <span class="volume-thumb"></span>
          </div>
        </div>
      </div>
    `
  }

  handleClick (e) {
    const volumeBarEl = this.renderRoot.querySelector('.volume-bar');
    const percentage = ((e.clientX || e.changedTouches[0].clientX) - getBoundingClientRectViewLeft(volumeBarEl) - 5.5) / vWidth;
    this.volumeChange(percentage)
  }

  mousedown (e) {
    document.addEventListener('mousemove', this.volumeMove)
    document.addEventListener('mouseup', this.volumeUp)
    //  volumeButtonEl.value.classList.add('player-volume-active');
  }

  volumeMove = (e) => {
    const volumeBarEl = this.renderRoot.querySelector('.volume-bar');
    const percentage = ((e.clientX || e.changedTouches[0].clientX) - getBoundingClientRectViewLeft(volumeBarEl) - 5.5) / vWidth;
    this.volumeChange(percentage)
  }

  volumeUp = (e) => {
    document.removeEventListener('mouseup', this.volumeUp);
    document.removeEventListener('mousemove', this.volumeMove);
    // volumeButtonEl.value.classList.remove('player-volume-active');
  }

  volumeChange (percentage) {
    percentage = parseFloat(percentage);
    if (!isNaN(percentage)) {
      percentage = Math.max(percentage, 0);
      percentage = Math.min(percentage, 1);
      //notice(`${t('volume')} ${(percentage * 100).toFixed(0)}%`)
      const detail = parseInt(percentage * 100)
      this.dispatchEvent(new CustomEvent('volume-change', { detail, bubbles: true, composed: true, }))
    }
  }

  toggleMute () {
    const detail = !this.mute
    this.dispatchEvent(new CustomEvent('mute-change', { detail, bubbles: true, composed: true, }))
  }
}

customElements.define('x-volume-ctrl', XVolumeCtrl)
