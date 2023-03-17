import ControlMessage from './control-message'
import { writeUInt8, writeUInt16BE, writeUInt32BE } from './buffer-view'

export default class TouchControlMessage extends ControlMessage {
  static PAYLOAD_LENGTH = 28;
  /**
   * - For a touch screen or touch pad, reports the approximate pressure
   * applied to the surface by a finger or other tool.  The value is
   * normalized to a range from 0 (no pressure at all) to 1 (normal pressure),
   * although values higher than 1 may be generated depending on the
   * calibration of the input device.
   * - For a trackball, the value is set to 1 if the trackball button is pressed
   * or 0 otherwise.
   * - For a mouse, the value is set to 1 if the primary mouse button is pressed
   * or 0 otherwise.
   *
   * - scrcpy server expects signed short (2 bytes) for a pressure value
   * - in browser TouchEvent has `force` property (values in 0..1 range), we
   * use it as "pressure" for scrcpy
   */
  static MAX_PRESSURE_VALUE = 0xffff;

  constructor (action, pointerId, position, pressure, buttons) {
    super(ControlMessage.TYPE_TOUCH);
    this.action = action
    this.pointerId = pointerId
    this.position = position
    this.pressure = pressure
    this.buttons = buttons
  }

  /**
   * @override
   */
  toBuffer () {
    const buffer = new ArrayBuffer(TouchControlMessage.PAYLOAD_LENGTH)
    const view = new Uint8Array(buffer)
  
    let offset = 0;
    offset = writeUInt8(view, this.type, offset);
    offset = writeUInt8(view, this.action, offset);
    offset = writeUInt32BE(view, 0, offset); // pointerId is `long` (8 bytes) on java side
    offset = writeUInt32BE(view, this.pointerId, offset);
    offset = writeUInt32BE(view, this.position.point.x, offset);
    offset = writeUInt32BE(view, this.position.point.y, offset);
    offset = writeUInt16BE(view, this.position.screenSize.width, offset);
    offset = writeUInt16BE(view, this.position.screenSize.height, offset);
    offset = writeUInt16BE(view, this.pressure * TouchControlMessage.MAX_PRESSURE_VALUE, offset);
    writeUInt32BE(view, this.buttons, offset);
    return buffer;
  }
}
