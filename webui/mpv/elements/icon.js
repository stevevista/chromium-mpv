import { LitElement, css, html } from 'lit'
// import DOMPurify from 'dompurify'

/* eslint-disable quote-props */
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
import IconCameraIris from '@mdi/svg/svg/camera-iris.svg?source'
import IconImageMutiple from '@mdi/svg/svg/image-multiple.svg?source'
import IconCog from '@mdi/svg/svg/cog.svg?source'
import IconCropFree from '@mdi/svg/svg/crop-free.svg?source'
import IconFullscreenExit from '@mdi/svg/svg/fullscreen-exit.svg?source'
import IconArrowLeftBoldBox from '@mdi/svg/svg/arrow-left-bold-box.svg?source'
import IconArrowRightBoldBox from '@mdi/svg/svg/arrow-right-bold-box.svg?source'
import IconRepeatOnce from '@mdi/svg/svg/repeat-once.svg?source'
import IconRepeat from '@mdi/svg/svg/repeat.svg?source'
import IconPlaylistMusic from '@mdi/svg/svg/playlist-music.svg?source'
import IconRepeatOff from '@mdi/svg/svg/repeat-off.svg?source'
import IconFaceRecognition from '@mdi/svg/svg/face-recognition.svg?source'
import IconCarHatchback from '@mdi/svg/svg/car-hatchback.svg?source'
import IconFaceManShimmerOutline from '@mdi/svg/svg/face-man-shimmer-outline.svg?source'
import IconHumanMaleBoy from '@mdi/svg/svg/human-male-boy.svg?source'
import IconFaceMan from '@mdi/svg/svg/face-man.svg?source'
import IconEye from '@mdi/svg/svg/eye.svg?source'
import IconEyeOffOutline from '@mdi/svg/svg/eye-off-outline.svg?source'
import IconAccountLock from '@mdi/svg/svg/account-lock.svg?source'
import IconLinkOff from '@mdi/svg/svg/link-off.svg?source'
import IconArrowExpand from '@mdi/svg/svg/arrow-expand.svg?source'
import IconChevronDoubleLeft from '@mdi/svg/svg/chevron-double-left.svg?source'
import IconChevronDoubleRight from '@mdi/svg/svg/chevron-double-right.svg?source'
import IconPlus from '@mdi/svg/svg/plus.svg?source'
import IconTrashCan from '@mdi/svg/svg/trash-can.svg?source'
import { htmlPolicy } from './policy'

const SVG_ICONS = {
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
  'camera-iris': trusted(IconCameraIris),
  'image-multiple': trusted(IconImageMutiple),
  'cog': trusted(IconCog),
  'crop-free': trusted(IconCropFree),
  'fullscreen-exit': trusted(IconFullscreenExit),
  'arrow-left-bold-box': trusted(IconArrowLeftBoldBox),
  'arrow-right-bold-box': trusted(IconArrowRightBoldBox),
  'repeat-once': trusted(IconRepeatOnce),
  'repeat': trusted(IconRepeat),
  'playlist-music': trusted(IconPlaylistMusic),
  'repeat-off': trusted(IconRepeatOff),
  'face-recognition': trusted(IconFaceRecognition),
  'car-hatchback': trusted(IconCarHatchback),
  'face-man-shimmer-outline': trusted(IconFaceManShimmerOutline),
  'human-male-boy': trusted(IconHumanMaleBoy),
  'face-man': trusted(IconFaceMan),
  'eye': trusted(IconEye),
  'eye-off-outline': trusted(IconEyeOffOutline),
  'account-lock': trusted(IconAccountLock),
  'link-off': trusted(IconLinkOff),
  'arrow-expand': trusted(IconArrowExpand),
  'chevron-double-left': trusted(IconChevronDoubleLeft),
  'chevron-double-right': trusted(IconChevronDoubleRight),
  'plus': trusted(IconPlus),
  'trash-can': trusted(IconTrashCan),
}

function trusted (raw) {
  return htmlPolicy.createHTML(raw)
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
      vertical-align: middle;
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

  render () {
    const size = this.size ? this.size + 'px' : '1em'
    
    const t = document.createElement('template')
    t.innerHTML = SVG_ICONS[this.name]

    return html`
    <style>
      :host {
        height: ${size};
      }
      :host([square]) {
        width: ${size};
      }
    </style>
    ${t.content}
    `
  }
}

customElements.define('x-icon', XIcon)
