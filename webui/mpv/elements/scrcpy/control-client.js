import KeyCodeControlMessage from './keycode-control-message'
import ScrollControlMessage from './scroll-control-message'
import TouchControlMessage from './touch-control-message'
import CommandControlMessage from './command-control-message'
import KeyEvent from './key-event'
import KeyToCodeMap from './key-code-map'
import MotionEvent from './motion-event'

const SCROLL_EVENT_THROTTLING_TIME = 30; // one event per 50ms

const EVENT_ACTION_MAP = {
  mousedown: MotionEvent.ACTION_DOWN,
  mousemove: MotionEvent.ACTION_MOVE,
  mouseup: MotionEvent.ACTION_UP,
  SIMULATE_MULTI_TOUCH: -1,
};

/* eslint-disable quote-props */
const KEYCODE_MAP = {
  'power': KeyEvent.KEYCODE_POWER,
  'volume-up': KeyEvent.KEYCODE_VOLUME_UP,
  'volume-down': KeyEvent.KEYCODE_VOLUME_DOWN,
  'back': KeyEvent.KEYCODE_BACK,
  'home': KeyEvent.KEYCODE_HOME,
  'app-switch': KeyEvent.KEYCODE_APP_SWITCH,
}

export default class ControlClient {
  repeatCounter = new Map()
  storedFromMouseEvent = new Map()

  lastScrollEvent = null
  lastPosition = null
  over = true
  multiTouchActive = false;
  multiTouchCenter = undefined;
  multiTouchShift = false

  keyboardEnabled = false

  constructor (ws, props, el) {
    this.ws = ws
    this.props = props
    this.el = el
    this.el.style['pointer-events'] = 'unset'
    this.el.addEventListener('mousedown', this.onInteraction)
    this.el.addEventListener('mouseup', this.onInteraction)
    this.el.addEventListener('mousemove', this.onInteraction)
    this.el.addEventListener('wheel', this.onInteraction)

    this.el.addEventListener('mouseenter', this.onMouseEnter)
    this.el.addEventListener('mouseleave', this.onMouseLeave)
  }

  close () {
    if (this.ws) {
      this.ws.close()
      this.ws = null

      this.el.style['pointer-events'] = 'none'
      this.el.removeEventListener('mousedown', this.onInteraction)
      this.el.removeEventListener('mouseup', this.onInteraction)
      this.el.removeEventListener('mousemove', this.onInteraction)
      this.el.removeEventListener('wheel', this.onInteraction)

      this.el.removeEventListener('mouseenter', this.onMouseEnter)
      this.el.removeEventListener('mouseleave', this.onMouseLeave)
    }
  }

  enableKeyboard (v) {
    this.keyboardEnabled = v
  }

  onInteraction = (e) => {
    e.preventDefault()
    e.stopPropagation()
    this.handleMouseEvent(e)
  }

  onMouseEnter = (e) => {
    this.over = true;
  }

  onMouseLeave = (e) => {
    this.lastPosition = undefined;
    this.over = false;
    this.purgeMouseMessages();
  }

  sendMessage (message) {
    if (this.ws) {
      this.ws.send(message.toBuffer())
      return true
    }
    return false
  }

  keyDown (name) {
    const code = KEYCODE_MAP[name]
    if (!code) {
      return false
    }
    return this.sendMessage(new KeyCodeControlMessage(KeyEvent.ACTION_DOWN, code, 0, 0))
  }

  keyUp (name) {
    const code = KEYCODE_MAP[name]
    if (!code) {
      return false
    }
    return this.sendMessage(new KeyCodeControlMessage(KeyEvent.ACTION_UP, code, 0, 0))
  }

  isOpen () {
    return !!this.ws
  }

  onKey (e) {
    if (this.keyboardEnabled) {
      this.handleKeyEvent(e)
    }

    if (!this.lastPosition) {
      return;
    }
    const { ctrlKey, shiftKey } = e;
    const { target, button, buttons, clientY, clientX } = this.lastPosition;
    const event = { ctrlKey, shiftKey, type: 'SIMULATE_MULTI_TOUCH', target, button, buttons, clientX, clientY };
    this._buildTouchEvent(event, new Map());
  }

  handleKeyEvent (e) {
    if (!this.isOpen()) {
      return false
    }
  
    const keyCode = KeyToCodeMap.get(e.code);
    if (!keyCode) {
      return;
    }
    let action;
    let repeatCount = 0;
    if (e.type === 'keydown') {
      action = KeyEvent.ACTION_DOWN;
      if (e.repeat) {
        let count = this.repeatCounter.get(keyCode);
        if (typeof count !== 'number') {
          count = 1;
        } else {
          count++;
        }
        repeatCount = count;
        this.repeatCounter.set(keyCode, count);
      }
    } else if (e.type === 'keyup') {
      action = KeyEvent.ACTION_UP;
      this.repeatCounter.delete(keyCode);
    } else {
      return;
    }
  
    const metaState =
              (e.getModifierState('Alt') ? KeyEvent.META_ALT_ON : 0) |
              (e.getModifierState('Shift') ? KeyEvent.META_SHIFT_ON : 0) |
              (e.getModifierState('Control') ? KeyEvent.META_CTRL_ON : 0) |
              (e.getModifierState('Meta') ? KeyEvent.META_META_ON : 0) |
              (e.getModifierState('CapsLock') ? KeyEvent.META_CAPS_LOCK_ON : 0) |
              (e.getModifierState('ScrollLock') ? KeyEvent.META_SCROLL_LOCK_ON : 0) |
              (e.getModifierState('NumLock') ? KeyEvent.META_NUM_LOCK_ON : 0);
  
    const controlMessage = new KeyCodeControlMessage(
      action,
      keyCode,
      repeatCount,
      metaState,
    );
    
    return this.sendMessage(controlMessage)
  }

  handleMouseEvent (e) {
    let messages
    if (e instanceof WheelEvent) {
      messages = this._buildScrollEvent(e)
    } else {
      if (e.button === 2) {
        if (e.type === 'mousedown') {
          this.sendMessage(CommandControlMessage.createBackOrPowerOnCommand(true))
        } else if (e.type === 'mouseup') {
          this.sendMessage(CommandControlMessage.createBackOrPowerOnCommand(false))
        }
        return
      } else if (e.button === 1) {
        if (e.type === 'mousedown') {
          this.keyDown('home')
        } else if (e.type === 'mouseup') {
          this.keyUp('home')
        }
        return
      }
      messages = this._buildTouchEvent(e, this.storedFromMouseEvent)
    }
  
    if (this.over) {
      this.lastPosition = e;
    }
  
    messages.forEach(m => this.sendMessage(m))
  }

  purgeMouseMessages () {
    this.storedFromMouseEvent.forEach((message) => {
      this.sendMessage(this._createEmulatedMessage(MotionEvent.ACTION_UP, message));
    });
    this.storedFromMouseEvent.clear();
    this._clearCanvas();
  }

  _buildTouchOnClient (e) {
    const action = EVENT_ACTION_MAP[e.type]
    const { width, height } = this.props
    let { clientWidth, clientHeight } = e.target;
    const rect = e.target.getBoundingClientRect();
    let touchX = e.clientX - rect.left;
    let touchY = e.clientY - rect.top;
    let invalid = false;
    if (touchX < 0 || touchX > clientWidth || touchY < 0 || touchY > clientHeight) {
      invalid = true;
    }
    const eps = 1e5;
    const ratio = width / height;
    const shouldBe = Math.round(eps * ratio);
    const haveNow = Math.round((eps * clientWidth) / clientHeight);
    if (shouldBe > haveNow) {
      const realHeight = Math.ceil(clientWidth / ratio);
      const top = (clientHeight - realHeight) / 2;
      if (touchY < top || touchY > top + realHeight) {
        invalid = true;
      }
      touchY -= top;
      clientHeight = realHeight;
    } else if (shouldBe < haveNow) {
      const realWidth = Math.ceil(clientHeight * ratio);
      const left = (clientWidth - realWidth) / 2;
      if (touchX < left || touchX > left + realWidth) {
        invalid = true;
      }
      touchX -= left;
      clientWidth = realWidth;
    }
    const x = (touchX * width) / clientWidth;
    const y = (touchY * height) / clientHeight;
    const size = { width, height }
    const point = { x, y }
    const position = { point, screenSize: size }
    if (x < 0 || y < 0 || x > width || y > height) {
      invalid = true;
    }

    return {
      client: {
        width: clientWidth,
        height: clientHeight,
      },
      touch: {
        invalid,
        action,
        position,
        buttons: e.buttons,
      },
    }
  }

  _buildScrollEvent (e) {
    const messages = []
    const touchOnClient = this._buildTouchOnClient(e);
    const hScroll = e.deltaX > 0 ? -1 : e.deltaX < 0 ? 1 : 0;
    const vScroll = e.deltaY > 0 ? -1 : e.deltaY < 0 ? 1 : 0;
    const time = Date.now();
    if (
      !this.lastScrollEvent ||
      time - this.lastScrollEvent.time > SCROLL_EVENT_THROTTLING_TIME ||
      this.lastScrollEvent.vScroll !== vScroll ||
      this.lastScrollEvent.hScroll !== hScroll
    ) {
      this.lastScrollEvent = { time, hScroll, vScroll };
      messages.push(new ScrollControlMessage(touchOnClient.touch.position, hScroll, vScroll, e.buttons));
    }
    return messages
  }

  _buildTouchEvent (e, storage) {
    const touches = this._getTouch(e, e.ctrlKey, e.shiftKey);
    const messages = []
    const points = []
  
    this._clearCanvas()
  
    touches.forEach((touch, pointerId) => {
      const { action, buttons, position } = touch
      const previous = storage.get(pointerId)
      if (!touch.invalid) {
        let pressure = 1.0;
        if (action === MotionEvent.ACTION_UP) {
          pressure = 0;
        }
        const message = new TouchControlMessage(action, pointerId, position, pressure, buttons)
        messages.push(...this._validateMessage(e, message, storage));
        points.push(touch.position.point)
      } else {
        if (previous) {
          points.push(previous.position.point);
        }
      }
    })
  
    if (this.multiTouchActive) {
      if (this.multiTouchCenter) {
        this._drawCenter(this.multiTouchCenter);
      }
      points.forEach((point) => {
        this._drawPointer(point);
      });
    }
  
    const hasActionUp = messages.find((message) => {
      return message.action === MotionEvent.ACTION_UP;
    });
    if (hasActionUp && storage.size) {
      console.warn('Looks like one of Multi-touch pointers was not raised up');
      storage.forEach((message) => {
        messages.push(this._createEmulatedMessage(MotionEvent.ACTION_UP, message));
      });
      storage.clear();
    }
  
    return messages
  }

  _getTouch (e, ctrlKey, shiftKey) {
    const touchOnClient = this._buildTouchOnClient(e)
    const { client, touch } = touchOnClient;
    const result = [touch];
    if (!ctrlKey) {
      this.multiTouchActive = false;
      this.multiTouchCenter = undefined;
      this.multiTouchShift = false;
      this._clearCanvas();
      return result;
    }
    const { position, action, buttons } = touch;
    const { point, screenSize } = position;
    const { width, height } = screenSize;
    const { x, y } = point;
    if (!this.multiTouchActive) {
      if (shiftKey) {
        this.multiTouchCenter = point;
        this.multiTouchShift = true;
      } else {
        this.multiTouchCenter = { x: client.width / 2, y: client.height / 2 };
      }
    }
  
    this.multiTouchActive = true;
    let opposite;
    let invalid = false;
    if (this.multiTouchShift && this.multiTouchCenter) {
      const oppoX = 2 * this.multiTouchCenter.x - x;
      const oppoY = 2 * this.multiTouchCenter.y - y;
      opposite = { x: oppoX, y: oppoY }
      if (!(oppoX <= width && oppoX >= 0 && oppoY <= height && oppoY >= 0)) {
        invalid = true;
      }
    } else {
      opposite = { x: client.width - x, y: client.height - y}
      invalid = touch.invalid;
    }
    if (opposite) {
      result.push({
        invalid,
        action,
        buttons,
        position: { point: opposite, screenSize },
      });
    }
    return result;
  }

  _validateMessage (originalEvent, message, storage) {
    const messages = [];
    const { action, pointerId } = message;
    const previous = storage.get(pointerId);
    if (action === MotionEvent.ACTION_UP) {
      if (!previous) {
        console.warn('Received ACTION_UP while there are no DOWN stored');
      } else {
        storage.delete(pointerId);
        messages.push(message);
      }
    } else if (action === MotionEvent.ACTION_DOWN) {
      if (previous) {
        console.warn('Received ACTION_DOWN while already has one stored');
      } else {
        storage.set(pointerId, message);
        messages.push(message);
      }
    } else if (action === MotionEvent.ACTION_MOVE) {
      if (!previous) {
        if (
          (originalEvent instanceof MouseEvent && originalEvent.buttons) ||
          (window['TouchEvent'] && originalEvent instanceof TouchEvent)
        ) {
          console.warn('Received ACTION_MOVE while there are no DOWN stored');
          const emulated = this._createEmulatedMessage(MotionEvent.ACTION_DOWN, message);
          messages.push(emulated);
          storage.set(pointerId, emulated);
        }
      } else {
        messages.push(message);
        storage.set(pointerId, message);
      }
    }
    return messages;
  }

  _createEmulatedMessage (action, event) {
    const { pointerId, position, buttons } = event;
    let pressure = event.pressure;
    if (action === MotionEvent.ACTION_UP) {
      pressure = 0;
    }
    return new TouchControlMessage(action, pointerId, position, pressure, buttons);
  }

  _clearCanvas () {
  }
  
  _drawCenter () {
  }
  
  _drawPointer () {
  }
}
