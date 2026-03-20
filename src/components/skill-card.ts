/**
 * <skill-card> — Card for displaying skill information.
 *
 * Used in both Installed and Marketplace tabs of the skills page.
 * Shows name, description, and either triggers (installed) or install count + button (marketplace).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('skill-card')
export class SkillCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .card {
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      transition: border-color 0.15s;
    }

    .card:hover {
      border-color: var(--color-accent);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-sm);
    }

    .name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .badge.group {
      background: var(--color-accent-dim);
      color: var(--color-accent);
    }

    .badge.installs {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
    }

    .description {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin-bottom: var(--spacing-sm);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
    }

    .path {
      font-size: 0.75rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .repo {
      font-size: 0.75rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
    }

    .install-btn {
      padding: var(--spacing-xs) var(--spacing-md);
      border: none;
      border-radius: var(--radius-sm);
      background: var(--color-accent);
      color: var(--color-bg-primary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .install-btn:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }

    .install-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .install-btn.installing {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
    }

    .install-btn.completed {
      background: var(--color-success);
      color: white;
    }

    .install-btn.failed {
      background: var(--color-error);
      color: white;
    }
  `;

  @property() name = '';
  @property() description = '';
  @property() repo?: string;
  @property() path?: string;
  @property() group?: string;
  @property({ type: Number }) installs?: number;
  @property({ type: Boolean }) installable = false;
  @property() installStatus?: string; // 'installing' | 'completed' | 'failed'

  override render() {
    return html`
      <div class="card">
        <div class="header">
          <span class="name">${this.name}</span>
          ${this.group
            ? html`<span class="badge group">${this.group}</span>`
            : nothing}
          ${this.installs !== undefined
            ? html`<span class="badge installs">${this._formatInstalls(this.installs)} installs</span>`
            : nothing}
        </div>
        <div class="description">${this.description || 'No description'}</div>
        <div class="meta">
          ${this.path ? html`<span class="path">${this.path}</span>` : nothing}
          ${this.repo ? html`<span class="repo">${this.repo}</span>` : nothing}
          ${this.installable ? this._renderInstallButton() : nothing}
        </div>
      </div>
    `;
  }

  private _renderInstallButton() {
    const status = this.installStatus;
    if (status === 'completed') {
      return html`<button class="install-btn completed" disabled>Installed</button>`;
    }
    if (status === 'failed') {
      return html`<button class="install-btn failed" @click=${this._handleInstall}>Retry</button>`;
    }
    if (status === 'installing') {
      return html`<button class="install-btn installing" disabled>Installing...</button>`;
    }
    return html`<button class="install-btn" @click=${this._handleInstall}>Install</button>`;
  }

  private _handleInstall(): void {
    if (this.installStatus === 'installing') return;
    this.dispatchEvent(
      new CustomEvent('install-skill', {
        detail: { repo: this.repo, name: this.name },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _formatInstalls(count: number): string {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'skill-card': SkillCard;
  }
}
