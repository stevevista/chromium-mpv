const LOCALE_STATUS_EVENT = 'x-video-locale-change'

class LocalizeController {
  constructor (host) {
    this.host = host
  }

  _localizeEventHandler = (e) => {
    this.host.requestUpdate()
  };

  hostConnected () {
    window.addEventListener(
      LOCALE_STATUS_EVENT,
      this._localizeEventHandler
    );
  }

  hostDisconnected () {
    window.removeEventListener(
      LOCALE_STATUS_EVENT,
      this._localizeEventHandler
    );
  }
}

export const updateWhenLocaleChanges = (host) =>
  host.addController(new LocalizeController(host))
