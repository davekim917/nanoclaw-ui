/**
 * <chat-input> — Message input with send button.
 *
 * Enter to send, Shift+Enter for newline.
 * Dispatches 'send-message' custom event with { detail: { text } }.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { ICON_PATHS } from '../utils/icons.js';

@customElement('chat-input')
export class ChatInput extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .input-container {
      display: flex;
      align-items: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--color-bg-secondary);
      border-top: 1px solid var(--color-border);
    }

    .input-wrapper {
      flex: 1;
      position: relative;
    }

    textarea {
      width: 100%;
      min-height: 44px;
      max-height: 160px;
      padding: 11px var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      line-height: 1.5;
      resize: none;
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      box-sizing: border-box;
    }

    textarea:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-dim);
    }

    textarea::placeholder {
      color: var(--color-text-muted);
    }

    textarea:disabled {
      opacity: 0.5;
    }

    .send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: var(--radius-full);
      background: var(--color-accent);
      color: var(--color-text-inverse);
      cursor: pointer;
      transition: background var(--transition-fast), transform 0.1s;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }

    .send-btn:active:not(:disabled) {
      transform: scale(0.9);
    }

    .send-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      box-shadow: none;
    }

    .send-btn svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .hint {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      padding: 3px var(--spacing-lg) var(--spacing-xs);
      background: var(--color-bg-secondary);
    }

    @media (max-width: 768px) {
      .input-container {
        padding: var(--spacing-sm) var(--spacing-sm);
        /* Safe area for iPhones with home bar */
        padding-bottom: max(var(--spacing-sm), env(safe-area-inset-bottom));
      }

      textarea {
        font-size: 1rem;
        min-height: 44px;
      }

      .hint {
        display: none;
      }
    }
  `;

  @property({ type: Boolean }) disabled = false;
  @state() private _text = '';
  @query('textarea') private _textarea!: HTMLTextAreaElement;

  override render() {
    const canSend = this._text.trim().length > 0 && !this.disabled;

    return html`
      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            rows="1"
            placeholder="Message NanoClaw..."
            .value=${this._text}
            ?disabled=${this.disabled}
            @input=${this._handleInput}
            @keydown=${this._handleKeydown}
          ></textarea>
        </div>
        <button
          class="send-btn"
          ?disabled=${!canSend}
          @click=${this._handleSend}
          title="Send message"
        >
          <svg viewBox="0 0 24 24">
            <path d="${ICON_PATHS.send}" />
          </svg>
        </button>
      </div>
      <div class="hint">Enter to send, Shift+Enter for newline</div>
    `;
  }

  private _handleInput(e: InputEvent): void {
    const textarea = e.target as HTMLTextAreaElement;
    this._text = textarea.value;
    this._autoResize(textarea);
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._handleSend();
    }
  }

  private _handleSend(): void {
    const text = this._text.trim();
    if (!text || this.disabled) return;

    this.dispatchEvent(
      new CustomEvent('send-message', {
        detail: { text },
        bubbles: true,
        composed: true,
      }),
    );

    this._text = '';
    if (this._textarea) {
      this._textarea.style.height = 'auto';
    }
  }

  private _autoResize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }

  /** Programmatic focus for the textarea. */
  focusInput(): void {
    this._textarea?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-input': ChatInput;
  }
}
