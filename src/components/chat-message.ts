/**
 * <chat-message> — Single message bubble with markdown rendering.
 *
 * Uses DOMPurify (HARD security requirement) to sanitize all rendered HTML.
 * Supports code blocks with CSS-only syntax highlighting, bold, italic,
 * lists, links, and tool call indicators.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import DOMPurify, { type Config } from 'dompurify';

// ── Markdown → HTML conversion (lightweight, no heavy lib) ──────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(raw: string): string {
  let text = raw;

  // Fenced code blocks: ```lang\ncode\n```
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    return `<pre><code${langClass}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`;
  });

  // Inline code: `code`
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => `<code>${escapeHtml(code)}</code>`);

  // Tool call indicators: 🔧 Tool: name or [tool_call: ...]
  text = text.replace(
    /(?:🔧\s*Tool:\s*(.+)|⚙️\s*(.+?)(?:\n|$))/g,
    (_m, t1: string, t2: string) => {
      const name = t1 || t2;
      return `<details class="tool-call"><summary>Tool: ${escapeHtml(name)}</summary></details>`;
    },
  );

  // Split into blocks (preserve pre/code)
  const blocks = text.split(/(<pre><code[\s\S]*?<\/code><\/pre>)/g);
  const processed = blocks.map(block => {
    if (block.startsWith('<pre>')) return block;

    let b = block;
    // Headers
    b = b.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    b = b.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    b = b.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    b = b.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    b = b.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    b = b.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Blockquotes
    b = b.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Bold + italic
    b = b.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    b = b.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    b = b.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    b = b.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Unordered lists
    b = b.replace(/(?:^|\n)((?:\s*[-*]\s+.+\n?)+)/g, (_m, list: string) => {
      const items = list
        .split(/\n/)
        .filter((l: string) => l.trim())
        .map((l: string) => `<li>${l.replace(/^\s*[-*]\s+/, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });

    // Ordered lists
    b = b.replace(/(?:^|\n)((?:\s*\d+\.\s+.+\n?)+)/g, (_m, list: string) => {
      const items = list
        .split(/\n/)
        .filter((l: string) => l.trim())
        .map((l: string) => `<li>${l.replace(/^\s*\d+\.\s+/, '')}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    });

    // Paragraphs (double newline)
    b = b.replace(/\n\n+/g, '</p><p>');

    // Single newlines → <br>
    b = b.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already block-level
    if (b.trim() && !b.trim().startsWith('<h') && !b.trim().startsWith('<ul') &&
        !b.trim().startsWith('<ol') && !b.trim().startsWith('<blockquote') &&
        !b.trim().startsWith('<details')) {
      b = `<p>${b}</p>`;
    }

    return b;
  });

  return processed.join('');
}

// ── DOMPurify config ────────────────────────────────────────────────

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'details', 'summary', 'span',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

// Force target="_blank" on all links
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function sanitize(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
}

// ── Component ───────────────────────────────────────────────────────

@customElement('chat-message')
export class ChatMessage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-md);
    }

    .message {
      display: flex;
      flex-direction: column;
      max-width: 80%;
    }

    .message.user {
      margin-left: auto;
      align-items: flex-end;
    }

    .message.assistant {
      margin-right: auto;
      align-items: flex-start;
    }

    .sender {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .bubble {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-lg);
      line-height: 1.6;
      font-size: 0.875rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .user .bubble {
      background: var(--color-accent-dim);
      border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
      color: var(--color-text-primary);
      border-bottom-right-radius: var(--radius-sm);
    }

    .assistant .bubble {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      color: var(--color-text-primary);
      border-bottom-left-radius: var(--radius-sm);
    }

    .timestamp {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-top: var(--spacing-xs);
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

    .bubble h1 { font-size: 1.25rem; }
    .bubble h2 { font-size: 1.125rem; }
    .bubble h3 { font-size: 1rem; }

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

    /* Code block keyword highlighting (CSS-only) */
    .bubble pre code .keyword {
      color: var(--color-purple);
    }

    @media (max-width: 768px) {
      .message {
        max-width: 90%;
      }
    }
  `;

  @property() content = '';
  @property() sender = '';
  @property({ type: Boolean }) isUser = false;
  @property() timestamp = '';

  override render() {
    const sanitizedHtml = sanitize(renderMarkdown(this.content));

    return html`
      <div class="message ${this.isUser ? 'user' : 'assistant'}">
        ${this.sender ? html`<span class="sender">${this.sender}</span>` : ''}
        <div class="bubble">${unsafeHTML(sanitizedHtml)}</div>
        ${this.timestamp
          ? html`<span class="timestamp">${this._formatTime(this.timestamp)}</span>`
          : ''}
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
