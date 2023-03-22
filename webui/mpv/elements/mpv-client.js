import { appendURLAuth } from './utils'

/* eslint-disable quote-props */
const DEFAULT_TIMEOUTS = 10000

const nodelayOptions = {
  'audio-buffer': 0,
  'vd-lavc-threads': 1,
  'cache-pause': 'no',
  'interpolation': 'no',
  'stream-buffer-size': '4k',
  'video-sync': 'desync',
  'video-latency-hacks': 'yes',
  'vd-lavc-o': 'flags=low_delay+unaligned',
  'untimed': 'yes',
}

const syncOptions = {
  'audio-buffer': 0.2,
  'vd-lavc-threads': 0,
  'cache-pause': 'yes',
  'interpolation': 'yes',
  'stream-buffer-size': '128k',
  'video-latency-hacks': 'no',
  'vd-lavc-o': 'flags=unaligned',
  'untimed': 'no',
}

const initOptions = {
  'network-timeout': 10,
  'osd-font-size': 30,
  'osd-duration': 2000,
  'screenshot-template': 'pic-%tY%tm%td-%tH%tM-%ws',
}

const observedProperties = [
  'video',
  'width',
  'height',
  'pause',
  'speed',
  'time-pos',
  'duration',
  'eof-reached',
  'filename',
  'path',
  'file-size',
  'file-format',
  'mute',
  'volume',
  'osd-dimensions',
  'idle-active',
  'media-title',
  'playlist-pos',
  'playlist',
  'video-codec',
  'audio-codec-name',
  'estimated-vf-fps',
  'estimated-frame-count',
  'hwdec-current',
  'options/demuxer-lavf-hacks',
  'options/demuxer-lavf-o', // {auth: user:pass}
  'track-list',
  'metadata'
]

const profiles = {
  nodelay: nodelayOptions,
  sync: syncOptions,
  init: initOptions,
}

export default class MpvClient {
  constructor (el) {
    this.$el = el

    this._init()
  }

  onMessage (e) {
    const handlers = this._eventHandlers[e.event]
    handlers && handlers.forEach(cb => cb(e))
  }

  onKeypress (e) {
    if (e.type === 'keydown') {
      this.keypress(e)
    }
  }

  load (source, mode = 'replace', options = {}) {
    // do not push password and username to player
    // instead construct a url with auth
    // for better co work with ffmpeg library
    if (options.username !== undefined) {
      const sources = Array.isArray(source) ? source : [source]
      for (let i = 0; i < sources.length; i++) {
        sources[i] = appendURLAuth(sources[i], options.username, options.password)
      }

      if (!Array.isArray(source)) {
        source = sources[0]
      }

      delete options.username
      delete options.password
    }

    if (Array.isArray(source)) {
      return this.loadMultiple(source, mode, options)
    }

    // fix rtsp sync issuse
    if (source.match(/^rtsp:\/\/(.*)/)) {
      if (!options) {
        options = {}
      }
      options['video-sync'] = 'display-desync'
    } else if (source.match(/^(scrcpy|adb):\/\/(.*)/)) {
      // nodelay
      options = { ...options, ...nodelayOptions }
    }

    return this.command('loadfile', source, mode, stringfyOptions(options))
  }

  loadMultiple (urls, mode, options) {
    this.load(urls[0], mode === 'append' ? 'append-play' : 'replace', options);
    for (let i = 1; i < urls.length; i++) {
      this.load(urls[i], 'append', options);
    }
  }

  profile (name) {
    const options = profiles[name] || {}
  
    for (const name in options) {
      this.option(name, options[name])
    }
  }

  profileSync (value) {
    if (value) {
      if (value === 'nodelay') {
        this.profile(value)
      } else {
        this.profile('sync')
        if (value === 'audio') {
          this.option('video-sync', 'audio')
        }
      }
    }
  }

  command (cmd, ...args) {
    const timeouts = cmd.timeout || DEFAULT_TIMEOUTS
    const command = cmd.name || cmd

    if (typeof cmd === 'string') {
      args = args.map(arg => arg.toString());
      cmd = [cmd].concat(args)
    } else {
      delete cmd.timeout
    }

    return this._asyncToPromise((id) => this._postRequest('command', cmd, id), `${command}`, timeouts)
  }

  keypress ({ key, shiftKey, ctrlKey, altKey }) {
    // Don't need modifier events.
    if ([
      'Escape', 'Shift', 'Control', 'Alt',
      'Compose', 'CapsLock', 'Meta'
    ].includes(key)) return;

    if (key.startsWith('Arrow')) {
      key = key.slice(5).toUpperCase();
      if (shiftKey) {
        key = `Shift+${key}`;
      }
    }
    if (ctrlKey) {
      key = `Ctrl+${key}`;
    }
    if (altKey) {
      key = `Alt+${key}`;
    }

    // Ignore exit keys for default keybindings settings.
    if ([
      'q', 'Q', 'ESC', 'POWER', 'STOP',
      'CLOSE_WIN', 'CLOSE_WIN', 'Ctrl+c',
      'AR_PLAY_HOLD', 'AR_CENTER_HOLD'
    ].includes(key)) return;

    this.command('keypress', key);
  }

  togglePlay (disable_rtsp) {
    if (this._props['idle-active']) {
      this.play()
    } else {
      // disable rtsp toggle
      if (disable_rtsp && this._props['file-format'].indexOf('rtsp') >= 0) {
        return
      }
      this.togglePause()
    }
  }

  togglePause () {
    this.command('cycle', 'pause')
  }

  toggleMute () {
    this.command('cycle', 'mute')
  }

  play (pos = 0) {
    if (this._props['playlist'].length === 0) {
      return
    }

    const playlistPos = this._props['playlist-pos']

    if (pos !== playlistPos) {
      this.property('playlist-pos', pos);
    } else {
      // if mpv is not idle and has files queued just set the pause state to false
      this.property('pause', false);
    }
  }

  property (...args) {
    if (args.length === 1) {
      const name = args[0]
      return this._asyncToPromise((id) => this._postRequest('get_property_async', name, id), `get property ${name}`, DEFAULT_TIMEOUTS)
    } else if (args.length > 1) {
      const name = args[0]
      const value = args[1]
      return this._asyncToPromise((id) => this._postRequest('set_property', { name, value }, id), `set property ${name}`, DEFAULT_TIMEOUTS)
        .catch(e => {
          console.log('---------', name, e)
        })
    }
  }

  option (name, value, postFix) {
    if (postFix) {
      this._postRequest('set_option', { name: `${name}-${postFix}`, value: value.toString() })
      return
    }
    return this.property(`options/${name}`, value);
  }

  scale (factor) {
    this.property('options/video-zoom', Math.log2(factor))
  }

  get_dimensions () {
    const d = this._props['osd-dimensions'] || {}
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
      frameWidth: this._props.width,
      frameHeight: this._props.height,
    };
  }

  crop (crop) {
    if (!crop) {
      this.scale(1)
      this.option('video-pan-x', 0)
      this.option('video-pan-y', 0)
      return
    }

    if (this._props['idle-active']) {
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
    const scale = Math.max(scaledWidth / crop.width, scaledHeight / crop.height)
    let expectDx = (left - crop.left) / scaledWidth
    let expectDy = (top - crop.top) / scaledHeight

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
  }

  registerEventHandler (name, cb) {
    if (!this._eventHandlers[name]) {
      this._eventHandlers[name] = [cb]
    } else {
      this._eventHandlers[name].push(cb)
    }
  }

  removeEventHandler (name, cb) {
    if (this._eventHandlers[name]) {
      this._eventHandlers[name] = this._eventHandlers[name].filter(h => h !== cb)
      if (!this._eventHandlers[name].length) {
        delete this._eventHandlers[name];
        return 0
      }
      return this._eventHandlers[name].length
    }
    return 0
  }

  observeProperty (name, type, fn) {
    let id
    if (typeof type === 'function') {
      fn = type
    }
  
    if (fn) {
      id = this._next_oid++;
      this._observers[id] = fn;
    }
    this._postRequest('observe_property', name, id);
  }

  unobserveProperty (fn) {
    for (const id in this._observers) {
      if (this._observers[id] === fn) {
        delete this._observers[id];
        this._postRequest('unobserve_property', id);
      }
    }
  }

  addHook (name, pri, fn) {
    this._hooks.push(fn);
    // 50 (scripting docs default priority) maps to 0 (default in C API docs)
    this._postRequest('hook_add', { name, priority: pri - 50, id: this._hooks.length })
  }

  _init () {
    this._next_gid = 1
    this._resolvers = {}; // items of id: {resolve, reject}
    this._next_oid = 1
    this._observers = {}; // items of id: fn
    this._eventHandlers = {}
    this._hooks = []; // array of callbacks, id is index+1

    this._props = {
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
  
    this.registerEventHandler('property-change', e => {
      if (e.data === undefined) {
        return
      }
      const cb = this._observers[e.id];
      if (cb) {
        cb(e.name, e.data);
      }

      if (!e.error) {
        this._props[e.name] = e.data
      }
    })

    this.registerEventHandler('get-property-reply', e => {
      this._resolveResponse(e, e => e.data)
    })

    this.registerEventHandler('command-reply', e => {
      this._resolveResponse(e, e => e.result)
    })

    this.registerEventHandler('set-property-reply', e => {
      this._resolveResponse(e, e => e.result)
    })

    this.registerEventHandler('hook', e => {
      const self = this
      let state = 0; // 0:initial, 1:deferred, 2:continued
      function do_cont () {
        state = 2
        self._postRequest('hook_continue', e.hook_id);
        return true
      }

      function err () { console.error('hook already continued') }
      function defer () {
        if (state === 2) {
          return err()
        }
        state = 1
        return true
      }
      function cont () { return state === 2 ? err() : do_cont() }

      const cb = e.id > 0 && this._hooks[e.id - 1];
      if (cb) {
        cb({ defer, cont });
      }
      return state === 0 ? do_cont() : true;
    })

    observedProperties.forEach(name => {
      this.observeProperty(name)
    })

    this.profile('init')
    this.option('demuxer-lavf-o', 'stimeout=10000000', 'add')
    // this.option('log-file', logPath)
  }

  _asyncToPromise (fn, hint, timeouts) {
    return new Promise((resolve, reject) => {
      const id = this._next_gid++;
      const timer = setTimeout(() => {
        delete this._resolvers[id]
        reject(new Error(`${hint}: timeout (${timeouts})`))
      }, timeouts)
      this._resolvers[id] = { resolve, reject, timer, hint }
      fn(id);
    })
  }

  _resolveResponse (e, unwrap) {
    const { resolve, reject, timer, hint } = (this._resolvers[e.id] || {})
    if (resolve) {
      delete this._resolvers[e.id]
      clearTimeout(timer)
      if (e.error) {
        reject(new Error(`${hint}: ${e.error}`))
      } else {
        resolve(unwrap(e))
      }
    }
  }

  _postRequest (type, data, id) {
    this.$el.postMessage({ type, data, id });
  }
}

function stringfyOptions (options) {
  return Object.keys(options)
    .map(k => `${k}=${options[k]}`)
    .join(',')
}
