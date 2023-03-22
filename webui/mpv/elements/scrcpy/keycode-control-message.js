import ControlMessage from './control-message'
import { writeInt8, writeInt32BE } from './buffer-view'

export default class KeyCodeControlMessage extends ControlMessage {
  static PAYLOAD_LENGTH = 13;

  constructor (action, keycode, repeat, metaState) {
    super(ControlMessage.TYPE_KEYCODE);
    this.action = action
    this.keycode = keycode
    this.repeat = repeat
    this.metaState = metaState
  }

  toBuffer () {
    const buffer = new ArrayBuffer(KeyCodeControlMessage.PAYLOAD_LENGTH + 1)
    const view = new Uint8Array(buffer)
  
    let offset = 0;
    offset = writeInt8(view, this.type, offset);
    offset = writeInt8(view, this.action, offset);
    offset = writeInt32BE(view, this.keycode, offset);
    offset = writeInt32BE(view, this.repeat, offset);
    writeInt32BE(view, this.metaState, offset);
    return buffer;
  }
}
