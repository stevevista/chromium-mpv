export default class ControlMessage {
  static TYPE_KEYCODE = 0;
  static TYPE_TEXT = 1;
  static TYPE_TOUCH = 2;
  static TYPE_SCROLL = 3;
  static TYPE_BACK_OR_SCREEN_ON = 4;
  static TYPE_EXPAND_NOTIFICATION_PANEL = 5;
  static TYPE_EXPAND_SETTINGS_PANEL = 6;
  static TYPE_COLLAPSE_PANELS = 7;
  static TYPE_GET_CLIPBOARD = 8;
  static TYPE_SET_CLIPBOARD = 9;
  static TYPE_SET_SCREEN_POWER_MODE = 10;
  static TYPE_ROTATE_DEVICE = 11;

  constructor (type) {
    this.type = type
  }
}
