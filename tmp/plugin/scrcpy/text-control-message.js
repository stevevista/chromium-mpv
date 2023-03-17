import ControlMessage from './control-message'
import { writeUInt8, writeUInt32BE } from './buffer-view'

export default class TextControlMessage extends ControlMessage {
  static TEXT_SIZE_FIELD_LENGTH = 4;
    
  constructor (text) {
    super(ControlMessage.TYPE_TEXT)
    this.text = text
  }

  toBuffer () {
    const length = this.text.length;
    const buffer = new ArrayBuffer(length + 1 + TextControlMessage.TEXT_SIZE_FIELD_LENGTH)
    const view = new Uint8Array(buffer)
  
    let offset = 0;
    offset = writeUInt8(view, this.type, offset);
    offset = writeUInt32BE(view, length, offset);

        buffer.write(this.text, offset);
    return buffer;
  }
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string, offset[, length][, encoding])
  if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    }
  }

  const remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  return utf8Write(this, string, offset, length)

}

