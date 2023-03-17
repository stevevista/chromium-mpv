import { LitElement, css, html } from 'lit'

export default class XStackedBtn extends LitElement {
  static styles = css`
  :host {
    display: flex;
  }

  :host([hidden]) {
    display: none !important;
  }

  :host .sub-group {
    position: absolute;
    bottom: 32px;
    display: none;
    flex-direction: column-reverse;
    z-index: 100;
    padding-bottom: 20px;
  }

  .sub-group ::slotted(*) {
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }

  :host(:hover) .sub-group {
    display: flex;
  }
  `

  render () {
    return html`
    <slot name="default"></slot>
    <div class="sub-group">
      <slot></slot>
    </div>
    `
  }
}

customElements.define('x-stacked-btn', XStackedBtn)
