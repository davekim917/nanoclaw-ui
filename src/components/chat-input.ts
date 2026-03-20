/**
 * <chat-input> — Message input with send button.
 *
 * Enter to send, Shift+Enter for newline.
 * Dispatches 'send-message' custom event with { detail: { text } }.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

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
      padding: var(--spacing-md);
      border-top: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
    }

    textarea {
      flex: 1;
      min-height: 40px;
      max-height: 160px;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      line-height: 1.5;
      resize: none;
      outline: none;
      transition: border-color 0.15s;
    }

    textarea:focus {
      border-color: var(--color-accent);
    }

    textarea::placeholder {
      color: var(--color-text-muted);
    }

    textarea:disabled {
      opacity: 0.6;
    }

    .send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--color-accent);
      color: var(--color-bg-primary);
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .send-btn svg {
      width: 18px;
      height: 18px;
    }

    .hint {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      padding: 0 var(--spacing-md) var(--spacing-xs);
      background: var(--color-bg-secondary);
    }
  `;

  @property({ type: Boolean }) disabled = false;
  @state() private _text = '';
  @query('textarea') private _textarea!: HTMLTextAreaElement;

  override render() {
    const canSend = this._text.trim().length > 0 && !this.disabled;

    return html`
      <div class="input-container">
        <textarea
          rows="1"
          placeholder="Type a message..."
          .value=${this._text}
          ?disabled=${this.disabled}
          @input=${this._handleInput}
          @keydown=${this._handleKeydown}
        ></textarea>
        <button
          class="send-btn"
          ?disabled=${!canSend}
          @click=${this._handleSend}
          title="Send message"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
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
