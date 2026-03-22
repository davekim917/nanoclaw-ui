/**
 * <chat-message> — Single message bubble with markdown rendering.
 *
 * Uses DOMPurify (HARD security requirement) to sanitize all rendered HTML.
 * Supports code blocks, bold, italic, lists, links, and tool call indicators.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderMarkdown, sanitize } from '../utils/markdown.js';
import { ICON_PATHS } from '../utils/icons.js';

// ── Component ───────────────────────────────────────────────────────

@customElement('chat-message')
export class ChatMessage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-lg);
      animation: fadeIn 0.25s ease;
    }

    .message {
      display: flex;
      gap: var(--spacing-sm);
      max-width: 85%;
    }

    .message.user {
      margin-left: auto;
      flex-direction: row-reverse;
    }

    .message.assistant {
      margin-right: auto;
    }

    /* Avatar */
    .avatar {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 2px;
    }

    .user .avatar {
      background: var(--color-user-bubble);
      color: #818cf8;
    }

    .assistant .avatar {
      background: var(--color-accent-dim);
      color: var(--color-accent);
    }

    .avatar svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .message-content {
      display: flex;
      flex-direction: column;
    }

    .user .message-content {
      align-items: flex-end;
    }

    .sender {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Bubbles */
    .bubble {
      padding: 10px var(--spacing-md);
      border-radius: var(--radius-lg);
      line-height: 1.65;
      font-size: 0.875rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .user .bubble {
      background: var(--color-user-bubble);
      border: 1px solid var(--color-user-border);
      color: var(--color-text-primary);
      border-bottom-right-radius: var(--radius-xs);
    }

    .assistant .bubble {
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      color: var(--color-text-primary);
      border-bottom-left-radius: var(--radius-xs);
    }

    .timestamp {
      font-size: 0.625rem;
      color: var(--color-text-muted);
      margin-top: 4px;
      opacity: 0.7;
    }

    /* Markdown content styles */
    .bubble p {
      margin: 0 0 var(--spacing-sm) 0;
    }

    .bubble p:last-child {
      margin-bottom: 0;
    }

    .bubble strong {
      font-weight: 600;
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
      font-size: 0.8125rem;
      line-height: 1.5;
    }

    .bubble ul, .bubble ol {
      margin: var(--spacing-sm) 0;
      padding-left: var(--spacing-lg);
    }

    .bubble li {
      margin-bottom: var(--spacing-xs);
    }

    .bubble blockquote {
      margin: var(--spacing-sm) 0;
      padding-left: var(--spacing-md);
      border-left: 3px solid var(--color-accent);
      color: var(--color-text-secondary);
    }

    .bubble a {
      color: var(--color-accent);
      text-decoration: none;
    }

    .bubble a:hover {
      text-decoration: underline;
    }

    .bubble h1, .bubble h2, .bubble h3,
    .bubble h4, .bubble h5, .bubble h6 {
      margin: var(--spacing-md) 0 var(--spacing-sm) 0;
      font-weight: 600;
      line-height: 1.3;
    }

    .bubble h1 { font-size: 1.125rem; }
    .bubble h2 { font-size: 1rem; }
    .bubble h3 { font-size: 0.9375rem; }

    .bubble details.tool-call {
      margin: var(--spacing-sm) 0;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-sm);
      background: var(--color-bg-tertiary);
      font-size: 0.8125rem;
    }

    .bubble details.tool-call summary {
      cursor: pointer;
      color: var(--color-accent);
      font-weight: 500;
    }

    .bubble table {
      border-collapse: collapse;
      width: 100%;
      margin: var(--spacing-sm) 0;
      font-size: 0.8125rem;
    }

    .bubble th, .bubble td {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--color-border);
      text-align: left;
    }

    .bubble th {
      background: var(--color-bg-tertiary);
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .message {
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

  @property() content = '';
  @property() sender = '';
  @property({ type: Boolean }) isUser = false;
  @property() timestamp = '';

  override render() {
    const sanitizedHtml = sanitize(renderMarkdown(this.content));
    const initials = this.sender ? this.sender.charAt(0).toUpperCase() : '';

    return html`
      <div class="message ${this.isUser ? 'user' : 'assistant'}">
        <div class="avatar">
          ${this.isUser
            ? html`${initials || 'Y'}`
            : html`<svg viewBox="0 0 24 24"><path d="${ICON_PATHS.bolt}" /></svg>`}
        </div>
        <div class="message-content">
          ${this.sender ? html`<span class="sender">${this.sender}</span>` : ''}
          <div class="bubble">${unsafeHTML(sanitizedHtml)}</div>
          ${this.timestamp
            ? html`<span class="timestamp">${this._formatTime(this.timestamp)}</span>`
            : ''}
        </div>
      </div>
    `;
  }

  private _formatTime(ts: string): string {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-message': ChatMessage;
  }
}
