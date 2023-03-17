import { LitElement, css, html } from 'lit'
// import DOMPurify from 'dompurify'
import IconEye from '@mdi/svg/svg/eye.svg?source'
import IconPlay from '@mdi/svg/svg/play.svg?source'
import IconPause from '@mdi/svg/svg/pause.svg?source'
import IconReplay from '@mdi/svg/svg/replay.svg?source'
import IconFolderOpen from '@mdi/svg/svg/folder-open.svg?source'
import IconFileMultiple from '@mdi/svg/svg/file-multiple.svg?source'
import IconLinkVariant from '@mdi/svg/svg/link-variant.svg?source'
import IconFastForward from '@mdi/svg/svg/fast-forward.svg?source'
import IconRewind from '@mdi/svg/svg/rewind.svg?source'
import IconVolumeMute from '@mdi/svg/svg/volume-mute.svg?source'
import IconVolumeHigh from '@mdi/svg/svg/volume-high.svg?source'
import IconVolumeMedium from '@mdi/svg/svg/volume-medium.svg?source'
import IconVolumeLow from '@mdi/svg/svg/volume-low.svg?source'
import IconInformationOutline from '@mdi/svg/svg/information-outline.svg?source'
import IconInvertColors from '@mdi/svg/svg/invert-colors.svg?source'
import IconCamera from '@mdi/svg/svg/camera.svg?source'
import IconCropFree from '@mdi/svg/svg/crop-free.svg?source'
import { htmlPolicy } from '../policy'

const SVG_ICONS = {
  'eye': trusted(IconEye),
  'play': trusted(IconPlay),
  'pause': trusted(IconPause),
  'replay': trusted(IconReplay),
  'folder-open': trusted(IconFolderOpen),
  'file-multiple': trusted(IconFileMultiple),
  'link-variant': trusted(IconLinkVariant),
  'fast-forward': trusted(IconFastForward),
  'rewind': trusted(IconRewind),
  'volume-mute': trusted(IconVolumeMute),
  'volume-high': trusted(IconVolumeHigh),
  'volume-medium': trusted(IconVolumeMedium),
  'volume-low': trusted(IconVolumeLow),
  'information-outline': trusted(IconInformationOutline),
  'invert-colors': trusted(IconInvertColors),
  'camera': trusted(IconCamera),
  'crop-free': trusted(IconCropFree),
}

function trusted (raw) {
  return raw
  // return DOMPurify.sanitize(raw, { RETURN_TRUSTED_TYPE: true })
}

export default class XIcon extends LitElement {
  static properties = {
    name: { type: String },
    size: { type: Number },
  }

  static styles = css`
    :host {
      display: inline-flex;
			vertical-align: baseline;
			align-items: center;
			justify-content: center;
			color: inherit;
    }

    :host([hidden]) {
			display: none !important;
		}

		:host([link]) {
			cursor: pointer;
		}

		:host([muted]) {
			opacity: .5;
		}

    :host([invalid]) {
			background: #f44336;
		}

    :host([rotate90]) { transform: rotate(90deg)}
		:host([rotate180]) { transform: rotate(180deg)}
		:host([rotate-90]) { transform: rotate(-90deg)}

    svg {
			height: 100%;
			min-width: 0;
			display: inline-block;
			fill: currentColor;
			color: currentColor;
		}

    @keyframes rotate360 {
			to { transform: rotate(360deg); }
		}

    @keyframes rotate360CCW {
			to { transform: rotate(-360deg); }
		}

    :host([spin]) svg {
			animation: 1600ms rotate360 infinite linear;
		}

    :host([name="arrows-ccw"][spin]) svg {
			animation: 1600ms rotate360CCW infinite linear;
		}
  `;

  static shadowRootOptions = { mode: 'closed' }

  constructor () {
    super()
  }

  render () {
    const size = typeof this.size === 'number' && this.size > 0 ? this.size + 'px' : '1em'
    
    const t = document.createElement('template')
    t.innerHTML = htmlPolicy.createHTML(SVG_ICONS[this.name])

    return html`
    <style>
      :host {
        height: ${size};
      }
      :host([square]) {
        width: ${size};
      }
    </style>
    ${ t.content }`
  }
}

customElements.define('x-icon', XIcon)
