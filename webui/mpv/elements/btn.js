import { LitElement, css, html } from 'lit'
import './icon'

export default class XBtn extends LitElement {
  static properties = {
    icon: { type: String },
    size: { type: Number },
    spin: { type: Boolean },
  }

  static styles = css`
    :host {
      --black: #333;
      --orange: #F57C00;
      --blue: #2196F3;
      --red: #d32f2f;
      --gray: #444444;
      --green: #27ae60;
      --yellow: #f2d57e;
      --teal: #009688;
      --purple: #7E57C2;
      --brown: #795548;
      --pink: #E91E63;

      --radius: 3px;
      --color: var(--x-btn-bgd, var(--theme-text, #000)) ;
      --bgdColor: var(--color);
      --hoverBgdColor: rgba(255,255,255,.1);
      --textColor: var(--x-btn-color, var(--theme-bgd, #fff));
      --borderColor: var(--color);
      --borderStyle: solid;
      --borderWidth: 1px;
      --padding: .4em .6em;

      display: inline-grid;
      position: relative;
      box-sizing: border-box;
      background: var(--bgdColor);
      color: var(--textColor);
      border-radius: var(--radius);
      cursor: pointer;
      transition: 
      color 160ms,
      background-color 160ms,
      border 160ms;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-size: var(--b-btn-font-size, .9rem);
      line-height: var(--b-btn-line-height, 1rem);
      font-weight: 600;
      font-family: var(--b-btn-font);
      outline: none;
      user-select: none; 
    }

    :host(:focus:not(:active):not(:hover)) {
      box-shadow: 0 0 0 2px var(--theme);
    }

    /* hide by default */
    @media print {
      :host {
        display: none;
      }
    }

    :host([disabled]) {
      pointer-events: none !important;
      opacity: .5;
    }

    :host([hidden]) {
      display: none !important;
    }

    main {
      border-radius: inherit;// var(--radius);
      position: relative;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      padding: var(--padding);
      box-sizing: border-box;
      /*padding-bottom: .3em;*/ /* remove descender line to make it look more centered*/
      text-overflow: ellipsis;
      border: var(--borderStyle) var(--borderWidth) var(--borderColor);
      min-width: 0;
      /* word-break: break-all; */
      /* transition: 120ms; */
    }

    :host([thin]) {
      --padding: 0 .6em;
    }

    :host([outline]:not(:hover)) {
      --bgdColor: transparent;
      --textColor: var(--color);
    }

    :host([text]),
    :host([clear]) {
      --bgdColor: transparent;
      --textColor: var(--color);
      --borderColor: transparent;
    }

    :host([icon-only]) {
      --padding: 1px 1px;
      --bgdColor: transparent;
      --textColor: var(--color);
      --borderColor: transparent;
    }

    main > span {
      display: inline-flex;
      justify-content: center;
      line-height: 0;
    }

    main slot {
      display: block;
      margin-bottom: -.1em; /* remove descender line to make it look more centered*/
    }

    main slot::slotted(*) {
      margin-top: 0;
      margin-bottom: 0;
    }

    main slot::slotted(:where(span, div, main, aside, section)) {
      display: inline-block;
    }

    .hover {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
      background: var(--hoverBgdColor);
      visibility: hidden;
      opacity: 0;
      /* mix-blend-mode: saturation; */
      border-radius: inherit;// var(--radius);
      /* transition: 120ms; */
    }

    @media (hover) {
      :host(:hover) .hover {
        opacity: 1;
        visibility: visible;
      }
    }
    
    :host([color^="black"])  { --color: var(--theme-text-accent, #222); --textColor: var(--theme-bgd, #fff); }
    :host([color^="white"])  { --color: var(--theme-bgd-accent2, #ddd); --textColor: var(--theme-text, #111); }
    :host([color^="teal"])   { --color: var(--teal); }
    :host([color^="gray"])   { --color: var(--gray); }
    :host([color^="blue"])   { --color: var(--blue); }
    :host([color^="red"])    { --color: var(--red); }
    :host([color^="green"])  { --color: var(--green); }
    :host([color^="yellow"]) { --color: var(--yellow); }
    :host([color^="purple"]) { --color: var(--purple); }
    :host([color^="brown"])  { --color: var(--brown); }
    :host([color^="pink"])   { --color: var(--pink); }
    :host([color^="orange"]) { --color: var(--orange); }
    :host([color^="deep-orange"]) { --color: var(--deep-orange); }
  `

  static shadowRootOptions = { mode: 'closed' }

  render () {
    const iconElem = this.icon ? html`<x-icon name="${this.icon}" size="${this.size}" ?spin=${this.spin}></x-icon>` : ''
    return html`
      <div class="hover" part="hover"></div>
      <main part="main">
        <span part="icon-area">
          <slot name="icon">
            ${iconElem}
          </slot>
        </span>
        <slot class="label" part="label"></slot>
      </main>
    `
  }
}

customElements.define('x-btn', XBtn)
