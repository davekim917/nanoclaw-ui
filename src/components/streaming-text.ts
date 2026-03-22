/**
 * <streaming-text> — Animated streaming text display.
 *
 * Appends text chunks from WS progress events and shows a pulsing cursor
 * during active streaming. Finalizes when session_end is received.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderStreamingMarkdown, sanitize } from '../utils/markdown.js';
import { ICON_PATHS } from '../utils/icons.js';

@customElement('streaming-text')
export class StreamingText extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-lg);
      animation: fadeIn 0.2s ease;
    }

    .streaming-container {
      display: flex;
      gap: var(--spacing-sm);
      max-width: 85%;
      align-items: flex-start;
    }

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-full);
      background: var(--color-accent-dim);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .avatar svg {
      width: 16px;
      height: 16px;
      stroke: var(--color-accent);
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .content {
      display: flex;
      flex-direction: column;
    }

    .label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .bubble {
      padding: 10px var(--spacing-md);
      border-radius: var(--radius-lg);
      border-bottom-left-radius: var(--radius-xs);
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      line-height: 1.65;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .bubble code {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      padding: 2px 6px;
      border-radius: var(--radius-xs);
      background: var(--color-bg-tertiary);
    }

    .bubble pre {
      margin: var(--spacing-sm) 0;
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      overflow-x: auto;
    }

    .bubble pre code {
      padding: 0;
      background: none;
    }

    .cursor {
      display: inline-block;
      width: 7px;
      height: 16px;
      background: var(--color-accent);
      border-radius: 2px;
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* Thinking state */
    .thinking {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px var(--spacing-md);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .thinking-dots {
      display: flex;
      gap: 3px;
    }

    .thinking-dots span {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--color-accent);
      animation: bounce 1.4s infinite;
      opacity: 0.4;
    }

    .thinking-dots span:nth-child(2) { animation-delay: 0.16s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.32s; }

    @keyframes bounce {
      0%, 80%, 100% { opacity: 0.4; transform: scale(1); }
      40% { opacity: 1; transform: scale(1.2); }
    }

    @media (max-width: 768px) {
      .streaming-container {
        max-width: 92%;
      }

      .avatar {
        width: 26px;
        height: 26px;
      }

      .avatar svg {
        width: 14px;
        height: 14px;
      }
    }
  `;

  @property() text = '';
  @property({ type: Boolean }) streaming = false;

  override render() {
    if (!this.streaming && !this.text) {
      return html``;
    }

    return html`
      <div class="streaming-container">
        <div class="avatar">
          <svg viewBox="0 0 24 24"><path d="${ICON_PATHS.pincer}" /></svg>
        </div>
        <div class="content">
          <span class="label">Assistant</span>
          ${this.streaming && !this.text
            ? html`
                <div class="thinking">
                  <span class="thinking-dots">
                    <span></span><span></span><span></span>
                  </span>
                  Thinking...
                </div>
              `
            : html`
                <div class="bubble">
                  ${unsafeHTML(sanitize(renderStreamingMarkdown(this.text)))}${this.streaming ? html`<span class="cursor"></span>` : ''}
                </div>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'streaming-text': StreamingText;
  }
}
