import { LitElement, css, html } from 'lit'

export default class XNotice extends LitElement {
  static styles = css`
  :host {
    position: absolute;
    bottom: 60px;
    left: 20px;
    font-size: 14px;
    border-radius: 2px;
    background: rgba(28, 28, 28, 0.9);
    padding: 7px 20px;
    transition: all .3s ease-in-out;
    overflow: hidden;
    color: #fff;
    pointer-events: none;
  }
  `

  static properties = {
    text: { type: String, state: true },
    opacity: { type: Number, state: true },
  }

  constructor () {
    super()

    this.text = ''
    this.opacity = 0
  }

  render () {
    return html`
    <style>
    :host {
      opacity: ${this.opacity};
    }
    </style>
    ${this.text}
    `
  }

  show (textVal, time = 2000, opacityVal = 0.8) {
    this.text = textVal;
    this.opacity = opacityVal;
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (time > 0) {
      this.timer = setTimeout(() => {
        this.opacity = 0;
      }, time);
    }
  }
}

customElements.define('x-notice', XNotice)
