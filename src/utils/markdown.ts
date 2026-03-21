/**
 * Shared markdown → HTML conversion and sanitization.
 * Used by both chat-message and streaming-text components.
 */

import DOMPurify, { type Config } from 'dompurify';

// ── HTML escaping ────────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Full markdown renderer (for completed messages) ──────────────────

export function renderMarkdown(raw: string): string {
  let text = raw;

  // Fenced code blocks: ```lang\ncode\n```
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    return `<pre><code${langClass}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`;
  });

  // Inline code: `code`
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => `<code>${escapeHtml(code)}</code>`);

  // Tool call indicators: 🔧 Tool: name or ⚙️ name
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

// ── Streaming markdown renderer (lightweight, no block processing) ───

export function renderStreamingMarkdown(raw: string): string {
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

// ── DOMPurify config ────────────────────────────────────────────────

export const PURIFY_CONFIG: Config = {
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

export function sanitize(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
}
