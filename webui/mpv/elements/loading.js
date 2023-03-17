import { LitElement, css, html } from 'lit'

export default class XLoading extends LitElement {
  static styles = css`
  :host {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: -18px 0 0 -18px;
    height: 36px;
    width: 36px;
    pointer-events: none;
  }
  
  svg {
    width: 100%;
    height: 100%;
  }
  
  circle {
    fill: #fff;
    animation: xplayer-loading-dot-fade 0.8s ease infinite;
    opacity: 0;
    transform-origin: 4px 4px;
  }

  @keyframes xplayer-loading-dot-fade {
    0% {
      opacity: 0.7;
      transform: scale(1.2, 1.2);
    }
    50% {
      opacity: 0.25;
      transform: scale(0.9, 0.9);
    }
    to {
      opacity: 0.25;
      transform: scale(0.85, 0.85);
    }
  }
  `

  render () {
    return html`
    <svg height="100%" version="1.1" viewBox="0 0 22 22">
      <svg x="7" y="1">
        <circle cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="11" y="3">
        <circle style="animation-delay: 0.1s;" cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="13" y="7">
        <circle style="animation-delay: 0.2s;" cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="11" y="11">
        <circle style="animation-delay: 0.3s;" cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="7" y="13">
        <circle style="animation-delay: 0.4s;" cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="3" y="11">
        <circle style="animation-delay: 0.5s;" cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="1" y="7">
        <circle style="animation-delay: 0.6s;" cx="4" cy="4" r="2"></circle>
      </svg>
      <svg x="3" y="3">
        <circle style="animation-delay: 0.7s;" cx="4" cy="4" r="2"></circle>
      </svg>
    </svg>
    `
  }
}

customElements.define('x-loading', XLoading)
