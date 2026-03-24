/**
 * <streaming-text> — Animated streaming text display.
 *
 * Appends text chunks from WS progress events and shows a pulsing cursor
 * during active streaming. Finalizes when session_end is received.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import DOMPurify, { type Config } from 'dompurify';

// Minimal markdown rendering for streaming content (same sanitizer as chat-message)
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderStreamingMarkdown(raw: string): string {
  let text = raw;

  // Fenced code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    return `<pre><code${langClass}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`;
  });

  // Inline code
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => `<code>${escapeHtml(code)}</code>`);

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Single newlines → <br>
  text = text.replace(/\n/g, '<br>');

  return text;
}

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'code', 'pre', 'span',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a', 'blockquote',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

@customElement('streaming-text')
export class StreamingText extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-md);
    }

    .streaming-container {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      align-items: flex-start;
    }

    .label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .bubble {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-lg);
      border-bottom-left-radius: var(--radius-sm);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .bubble code {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      padding: 1px 4px;
      border-radius: var(--radius-sm);
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
      width: 8px;
      height: 16px;
      background: var(--color-accent);
      border-radius: 1px;
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .empty-streaming {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .thinking-dots span {
      animation: dot-pulse 1.4s infinite;
      opacity: 0.3;
    }

    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes dot-pulse {
      0%, 80%, 100% { opacity: 0.3; }
      40% { opacity: 1; }
    }

    @media (max-width: 768px) {
      .streaming-container {
        max-width: 90%;
      }
    }
  `;

  @property() text = '';
  @property({ type: Boolean }) streaming = false;

  override render() {
    if (!this.streaming && !this.text) {
      return html``;
    }

    if (this.streaming && !this.text) {
      return html`
        <div class="streaming-container">
          <span class="label">Assistant</span>
          <div class="empty-streaming">
            <span class="thinking-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
            Thinking
          </div>
        </div>
      `;
    }

    const sanitized = DOMPurify.sanitize(
      renderStreamingMarkdown(this.text),
      PURIFY_CONFIG,
    );

    return html`
      <div class="streaming-container">
        <span class="label">Assistant</span>
        <div class="bubble">
          ${unsafeHTML(sanitized)}${this.streaming ? html`<span class="cursor"></span>` : ''}
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
