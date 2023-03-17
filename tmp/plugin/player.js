import PluginBase from './base'
import ControlClient from './scrcpy/control-client'
import { parseURL, appendURLAuth } from './utils'

/* eslint-disable dot-notation */
//
// Events:
const DEFAULT_TIMEOUTS = 10000

export default class MPVPlayer extends PluginBase {
  constructor (el) {
    super(el)

    this.next_oid = 1
    this.observers = {}; // items of id: fn
    this.next_gid = 1
    this.resolvers = {}; // items of id: {resolve, reject}
    this.next_assid = 1;
    

    this.props = {
      loading: false,
      screenshotting: false,
      fullscreen: false,
      mute: false,
      volume: 100,
      pause: false,
      'idle-active': true,
      'playlist-count': 0,
      'options/osd-font': 'sans-serif',
      'options/osd-font-size': 55,
      'options/osd-border-size': 3,
      'options/osd-duration': 1000
    }
    
    this.install()
    this.init()
  }

  install () {
    this._disposables.push(() => {
      if (this.keydownEnabled) {
        document.removeEventListener('keydown', this.onKeyDown, false)
        document.removeEventListener('keyup', this.onKeyUp, false)
      }
    })

    const onMessage = ({ data: e }) => {
      const handlers = this._eventHandlers[e.event];
      handlers && handlers.forEach(cb => cb(e));
    };

    this.listenKeydown(true)

    this.$el.addEventListener('message', onMessage);
    this._disposables.push(() => {
      this.$el.removeEventListener('message', onMessage)
    })
  }

  listenKeydown (enable) {
    if (enable) {
      document.addEventListener('keydown', this.onKeyDown, false)
      document.addEventListener('keyup', this.onKeyUp, false)
    } else {
      document.removeEventListener('keydown', this.onKeyDown, false)
      document.removeEventListener('keyup', this.onKeyUp, false)
    }
    this.keydownEnabled = enable
  }

  init () {
    // rtsp auth
    this.add_hook('on_load_fail', 0, async ({ defer, cont }) => {
      const path = this.props['path']
      const parts = parseURL(path)

      if (parts?.protocol === 'rtsp') {
        if (this.props['options/demuxer-lavf-hacks'] === 2) {
          cont()

          if (typeof this.auth_callback === 'function') {
            this.auth_callback(path, parts.username, parts.password, ({ cancel, username, password }) => {
              if (!cancel && username) {
                // wait some time for play end
                setTimeout(() => { this.load(path, 'replace', { 'demuxer-lavf-hacks': 1, username, password }) }, 100)
              }
            })
          }
          return
        }
      }

      cont()
    })

    // generate loading & screenshotting properties
    this.register_event('start-file', () => {
      this.triggerProp('loading', true)
      this.triggerProp('screenshotting', false)
    })

    this.register_event('end-file', () => {
      this.triggerProp('loading', false)
      this.triggerProp('screenshotting', false)

      this._closeScrcpy()
    })

    this.register_event('file-loaded', () => {
      this.triggerProp('loading', false)
    })
  }

  _closeScrcpy () {
    if (this._scrcpyClient) {
      this._scrcpyClient.close()
      this._scrcpyClient = null

      const handlers = this._eventHandlers['scrcpy-control']
      handlers && handlers.forEach(cb => cb(null))
    }
  }

  triggerProp (name, value) {
    this.onPropertyChangeDefault(name, value)
    this._on_prop(name, value)
  }

  setNodelay () {
    this.option('audio-buffer', 0)
    this.option('vd-lavc-threads', 1)
    this.option('cache-pause', false)
    this.option('interpolation', false)
    this.option('stream-buffer-size', '4k')
    this.option('video-sync', 'desync')
    this.option('video-latency-hacks', true)
    this.option('vd-lavc-o', 'flags=low_delay+unaligned')
    this.option('untimed', true)
  }

  setSyncOptions (value) {
    if (value !== null) {
      if (value === 'nodelay') {
        this.setNodelay()
      } else {
        this.option('audio-buffer', 0.2)
        this.option('vd-lavc-threads', 0)
        this.option('cache-pause', true)
        this.option('interpolation', true)
        this.option('stream-buffer-size', '128k')
        this.option('video-latency-hacks', false)
        this.option('vd-lavc-o', 'flags=unaligned')
        this.option('untimed', false)
        if (value === 'audio') {
          this.option('video-sync', 'audio')
        }
      }
    }
  }

  get_dimensions () {
    const d = this.props['osd-dimensions'] || {}
    return {
      width: d.w,
      height: d.h,
      scaledWidth: d.w - d.ml - d.mr,
      scaledHeight: d.h - d.mt - d.mb,
      left: d.ml,
      right: d.mr,
      top: d.mt,
      bottom: d.mb,
      aspect: d.aspect,
      frameWidth: this.props.width,
      frameHeight: this.props.height,
    };
  }

  // wrapped function

  // playlist
  load (source, mode = 'replace', options = {}) {
    if (Array.isArray(source)) {
      return this.load_files(source, mode, options)
    }

    // fix rtsp sync issuse
    if (source.match(/^rtsp:\/\/(.*)/)) {
      if (!options) {
        options = {}
      }
      options['video-sync'] = 'display-desync'
    } else if (source.match(/^(scrcpy|adb):\/\/(.*)/)) {
      // nodelay
      options['audio-buffer'] = 0
      options['vd-lavc-threads'] = 1
      options['cache-pause'] = 'no'
      options['interpolation'] = 'no'
      options['stream-buffer-size'] = '4k'
      options['video-sync'] = 'desync'
      options['video-latency-hacks'] = 'yes'
      options['vd-lavc-o'] = 'flags=low_delay+unaligned'
      options['untimed'] = 'yes'
    }

    return this.command('loadfile', source, mode, stringfyOptions(options));
  }

  scale (factor) {
    this.property('options/video-zoom', Math.log2(factor))
  }

  // player interface
  load_files (urls, mode, options) {
    this.load(urls[0], mode === 'append' ? 'append-play' : 'replace', options);
    for (let i = 1; i < urls.length; i++) {
      this.load(urls[i], 'append', options);
    }
  }

  toggle_play (disable_rtsp) {
    if (this.props['idle-active']) {
      this.play()
    } else {
      // disable rtsp toggle
      if (disable_rtsp && this.props['file-format'].indexOf('rtsp') >= 0) {
        return
      }
      this.togglePause()
    }
  }

  next_frame () {
    return this.command('frame-step')
  }

  prev_frame () {
    return this.command('frame-back-step')
  }

  on_auth_require (cb) {
    this.auth_callback = cb
  }

  // rect: [x0, y0, x1, y1]
  crop (rect) {
    if (!rect) {
      this.scale(1)
      this.option('video-pan-x', 0)
      this.option('video-pan-y', 0)
      this._on_prop('zooming', false)
      return
    }

    if (this.props['idle-active']) {
      return
    }

    const dim = this.get_dimensions()
    let { scaledWidth, scaledHeight, width, height, left, top } = dim
    const par = scaledWidth / scaledHeight
    const dar = width / height
    let w, h
    if (par > dar) {
      w = width
      h = width / par
    } else {
      h = height
      w = height * par 
    }
    const scale = Math.max(scaledWidth / (rect[2] - rect[0]), scaledHeight / (rect[3] - rect[1]))
    let expectDx = (left - rect[0]) / scaledWidth
    let expectDy = (top - rect[1]) / scaledHeight

    this.scale(scale)
    scaledWidth = w * scale
    scaledHeight = h * scale
    expectDx *= scaledWidth
    expectDy *= scaledHeight
    const deltaX = (width - scaledWidth) / 2
    const deltaY = (height - scaledHeight) / 2

    const panX = (expectDx - deltaX) / scaledWidth
    const panY = (expectDy - deltaY) / scaledHeight
    this.option('video-pan-x', panX)
    this.option('video-pan-y', panY)

    this._on_prop('zooming', true)
  }
}
