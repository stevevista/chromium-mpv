import ControlMessage from './control-message'
import KeyEvent from './key-event'
import { writeInt8, writeUInt8, writeUInt32BE, writeLengthText, stringToUtf8ByteArray } from './buffer-view'

export default class CommandControlMessage extends ControlMessage {
  createBufferView (length) {
    const buffer = new ArrayBuffer(length)
    const view = new Uint8Array(buffer)

    writeInt8(view, this.type, 0)
    this.buffer = buffer
  
    return view
  }

  static createBackOrPowerOnCommand (down) {
    return CommandControlMessage._createPayloadCommand(
      ControlMessage.TYPE_BACK_OR_SCREEN_ON,
      down ? KeyEvent.ACTION_DOWN : KeyEvent.ACTION_UP)
  }

  static createSetScreenPowerModeCommand (mode) {
    return CommandControlMessage._createPayloadCommand(
      ControlMessage.TYPE_SET_SCREEN_POWER_MODE,
      mode ? 1 : 0)
  }

  static createGetClipboardCommand (mode) {
    let val = 0
    if (mode === 'copy') {
      val = 1
    } else if (mode === 'cut') {
      val = 2
    }
    return CommandControlMessage._createPayloadCommand(
      ControlMessage.TYPE_GET_CLIPBOARD,
      val)
  }

  static createSetClipboardCommand (text, paste = false, seq = 0) {
    const bytes = stringToUtf8ByteArray(text)
    const msg = new CommandControlMessage(ControlMessage.TYPE_SET_CLIPBOARD)
    const view = msg.createBufferView(1 + 8 + 1 + 4 + bytes.length)
    writeUInt32BE(view, 0, 1)
    writeUInt32BE(view, seq, 5)
    writeUInt8(view, paste ? 1 : 0, 9)
    writeLengthText(view, bytes, 10)

    return msg
  }

  static _createPayloadCommand (type, ...args) {
    const msg = new CommandControlMessage(type)
    const view = msg.createBufferView(1 + args.length)
    for (let i = 0; i < args.length; i++) {
      writeUInt8(view, args[i], i + 1)
    }

    return msg
  }

  toBuffer () {
    return this.buffer
  }
}
