import { LitElement, css, html } from 'lit'
import i18n from '../i18n'
import { filesize } from './utils'
import { updateWhenLocaleChanges } from './localized'

export default class XMediaInfo extends LitElement {
  static styles = css`
  :host {
    background: rgba(28, 28, 28, 0.6);
    padding: 10px;
    color: #fff;
    font-size: 12px;
    border-radius: 2px;
  }

  :host([hidden]) {
    display: none !important;
  }

  .close {
    cursor: pointer;
    position: absolute;
    right: 10px;
    top: 10px;
  }

  .item span {
    display: inline-block;
    vertical-align: middle;
    line-height: 15px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .item .title {
    width: 100px;
    text-align: right;
    margin-right: 10px;
  }

  .item .data {
    width: 260px;
  }
  `

  static properties = {
    path: { type: String },
    format: { type: String },
    transport: { type: String },
    size: { type: Number },
    width: { type: Number },
    height: { type: Number },
    fps: { type: Number },
    drops: { type: Number },
    duration: { type: Number },
    videoc: { type: String },
    audioc: { type: String },
    hwdec: { type: String },
    sync: { type: String },
  }

  constructor () {
    super()
    updateWhenLocaleChanges(this)

    this.path = ''
    this.format = ''
    this.transport = ''
    this.size = 0
    this.width = 0
    this.height = 0
    this.fps = 0
    this.drops = 0
    this.duration = 0
    this.videoc = ''
    this.audioc = ''
    this.hwdec = ''
    this.sync = ''
  }

  render () {
    const shortUrl = computeShortPath(this.path)
    const sizeDisplay = this.size > 0 ? filesize(this.size).human() : ''

    return html`
    <div class="close" @click=${this.close}>[x]</div>
    <div class="item">
      <span class="title">${i18n.t('video.source_path')}</span>
      <span class="data">${shortUrl}</span>
    </div>
    <div class="item">
      <span class="title">${i18n.t('video.format')}</span>
      <span class="data">${this.format} ${this.transport ? `[${this.transport}]` : ''}</span>
    </div>
    <div class="item">
      <span class="title">${i18n.t('video.source_size')}</span>
      <span class="data">${sizeDisplay}</span>
    </div>
    <div class="item" v-show="width && height">
      <span class="title">${i18n.t('video.resolution')}</span>
      <span class="data">${this.width} x ${this.height}</span>
    </div>
    <div class="item" v-show="fps">
      <span class="title">${i18n.t('video.fps')}</span>
      <span class="data">${this.fps.toFixed(2)}</span>
    </div>
    <div class="item" v-show="drops">
      <span class="title">${i18n.t('video.drops')}</span>
      <span class="data">${this.drops.toFixed(2)}</span>
    </div>
    <div class="item" v-show="duration > 0">
      <span class="title">${i18n.t('video.duration')}</span>
      <span class="data">${formatDuration(this.duration)}</span>
    </div>
    <div class="item">
      <span class="title">${i18n.t('video.video')}</span>
      <span class="data">${this.videoc}</span>
    </div>
    <div class="item">
      <span class="title">${i18n.t('audio')}</span>
      <span class="data">${this.audioc}</span>
    </div>
    <div class="item" v-show="sync">
      <span class="title">${i18n.t('sync-type')}</span>
      <span class="data">${this.sync}</span>
    </div>
    <div class="item" v-show="hwdec">
      <span class="title">${i18n.t('video.hwaccel')}</span>
      <span class="data">${this.hwdec}</span>
    </div>
    `
  }

  close () {
    this.dispatchEvent(new Event('toggle-info', { bubbles: true, composed: true, }))
  }
}

customElements.define('x-media-info', XMediaInfo)

function computeShortPath (path) {
  if (!path) {
    return ''
  }
  if (/^(rtsp|http|adb|scrcpy):\/\//.test(path)) {
    if (path.length < 38) {
      return path
    }
    return path.slice(0, 38) + ' ...';
  }
  // show only filename
  const group = path.split('\\');
  return group.pop();
}

function formatDuration (secs) {
  if (typeof secs !== 'number' || isNaN(secs) || secs === Infinity || secs < 0) {
    return ''
  }
      
  function align (s) {
    return s < 10 ? '0' + s : String(s)
  }
  secs = Math.floor(secs);
  let mins = Math.floor(secs / 60);
  let hours = Math.floor(mins / 60);
  secs %= 60;
  mins %= 60;
  return align(hours) + ':' + align(mins) + ':' + align(secs)
}
