import ControlMessage from './control-message'
import { writeUInt8, writeUInt16BE, writeUInt32BE } from './buffer-view'

export default class ScrollControlMessage extends ControlMessage {
  static PAYLOAD_LENGTH = 20;

  constructor (position, hScroll, vScroll, buttons) {
    super(ControlMessage.TYPE_SCROLL)
    this.position = position
    this.hScroll = hScroll > 0 ? 32767 : 32768
    this.vScroll = vScroll > 0 ? 32767 : 32768
    this.buttons = buttons
  }

  toBuffer () {
    const buffer = new ArrayBuffer(ScrollControlMessage.PAYLOAD_LENGTH + 1)
    const view = new Uint8Array(buffer)

    let offset = 0;
    offset = writeUInt8(view, this.type, offset);
    offset = writeUInt32BE(view, this.position.point.x, offset);
    offset = writeUInt32BE(view, this.position.point.y, offset);
    offset = writeUInt16BE(view, this.position.screenSize.width, offset);
    offset = writeUInt16BE(view, this.position.screenSize.height, offset);
    offset = writeUInt16BE(view, this.hScroll, offset);
    offset = writeUInt16BE(view, this.vScroll, offset);
    writeUInt32BE(view, this.buttons, offset);
    return buffer;
  }
}
