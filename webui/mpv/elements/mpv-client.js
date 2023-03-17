const DEFAULT_TIMEOUTS = 10000

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

export default class MpvClient {
  constructor (el) {
    this.$el = el
    this._init()
  }

  handleMessage (e) {
    const ev = e.data
    const handlers = this._eventHandlers[ev.event];
    handlers && handlers.forEach(cb => cb(ev))
  }

  registerEvent (event, cb) {
    if (!this._eventHandlers[event]) {
      this._eventHandlers[event] = [cb]
    } else {
      this._eventHandlers[event].push(cb)
    }
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

  addHook (name, pri, fn) {
    this._hooks.push(fn);
    // 50 (scripting docs default priority) maps to 0 (default in C API docs)
    this._postRequest('hook_add', { name, priority: pri - 50, id: this._hooks.length });
  }

  property (...args) {
    if (args.length === 1) {
      const name = args[0]
      return this._async_to_promise((id) => this._postRequest('get_property_async', name, id), `get property ${name}`, DEFAULT_TIMEOUTS)
    } else if (args.length > 1) {
      const name = args[0]
      const value = args[1]
      return this._async_to_promise((id) => this._postRequest('set_property', { name, value }, id), `set property ${name}`, DEFAULT_TIMEOUTS)
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

  command (cmd, ...args) {
    const timeouts = cmd._timeout || DEFAULT_TIMEOUTS
    const command = cmd.name || cmd

    if (typeof cmd === 'string') {
      args = args.map(arg => arg.toString());
      cmd = [cmd].concat(args)
    } else {
      delete cmd._timeout
    }

    return this._async_to_promise((id) => this._postRequest('command', cmd, id), `${command}`, timeouts)
  }

  load (source, mode = 'replace', options = {}) {
    return this.command('loadfile', source, mode, stringfyOptions(options));
  }

  togglePause () {
    this.command('cycle', 'pause')
  }

  toggleMute () {
    this.command('cycle', 'mute')
  }

  togglePlay () {
    if (this._props['idle-active']) {
      this.play()
    } else {
      this.togglePause()
    }
  }

  play (pos = 0) {
    if (this._props.playlist.length === 0) {
      return
    }

    if (pos !== this._props['playlist-pos']) {
      return this.property('playlist-pos', pos)
    } else {
      // if mpv is not idle and has files queued just set the pause state to false
      return this.property('pause', false)
    }
  }

  seek (target, flag = 'relative') {
    return this.command('seek', target, flag, 'exact')
  }

  seekPercent (target) {
    return this.seek(target, 'absolute-percent')
  }

  stop () {
    this.property('playlist-pos', -1)
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

  _init () {
    this._eventHandlers = {}
    this._next_oid = 1
    this._observers = {}; // items of id: fn
    this._next_gid = 1
    this._resolvers = {}; // items of id: {resolve, reject}
    this._hooks = []; // array of callbacks, id is index+1

    this._props = {
      playlist: [],
      'playlist-pos': -1,
    }

    this.registerEvent('property-change', e => {
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

    this.registerEvent('get-property-reply', e => {
      this._on_resolve(e, e => e.data)
    })

    this.registerEvent('command-reply', e => {
      this._on_resolve(e, e => e.result)
    })

    this.registerEvent('set-property-reply', e => {
      this._on_resolve(e, e => e.result)
    })

    this.registerEvent('hook', e => {
      let state = 0; // 0:initial, 1:deferred, 2:continued
      function do_cont () {
        state = 2
        this._postRequest('hook_continue', e.hook_id);
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
    });

    observedProperties.forEach(name => {
      this.observeProperty(name)
    })

    this.option('network-timeout', 10)
    this.option('demuxer-lavf-o', 'stimeout=10000000', 'add')
    this.option('osd-font-size', 30)
    this.option('osd-duration', 2000)
    this.option('screenshot-template', 'pic-%tY%tm%td-%tH%tM-%ws')
    // this.option('hot-detection', true)
  }

  _async_to_promise (fn, hint, timeouts) {
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

  _on_resolve (e, unwrap) {
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
