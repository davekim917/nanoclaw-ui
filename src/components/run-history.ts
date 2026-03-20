/**
 * <run-history> — Timeline of past task runs.
 *
 * Shows status icon, run time, duration, and expandable result/error text.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TaskRunLogRow } from '../api/types.js';
import { relativeTime } from '../utils/format.js';

@customElement('run-history')
export class RunHistory extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .timeline {
      position: relative;
      padding-left: var(--spacing-lg);
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--color-border);
    }

    .run-entry {
      position: relative;
      padding-bottom: var(--spacing-md);
    }

    .run-entry:last-child {
      padding-bottom: 0;
    }

    .status-icon {
      position: absolute;
      left: -20px;
      top: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      background: var(--color-bg-primary);
      border: 2px solid var(--color-border);
    }

    .status-icon.success {
      border-color: var(--color-success);
      color: var(--color-success);
    }

    .status-icon.error {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .status-icon.running {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .run-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      cursor: pointer;
      padding: var(--spacing-xs) 0;
    }

    .run-header:hover .run-time {
      color: var(--color-text-primary);
    }

    .run-time {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      transition: color 0.15s;
    }

    .run-duration {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .run-status-label {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .run-status-label.success { color: var(--color-success); }
    .run-status-label.error { color: var(--color-error); }
    .run-status-label.running { color: var(--color-accent); }

    .expand-icon {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      transition: transform 0.15s;
    }

    .expand-icon.expanded {
      transform: rotate(90deg);
    }

    .run-detail {
      margin-top: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--color-text-secondary);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 300px;
      overflow-y: auto;
    }

    .run-detail.error-text {
      border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
      color: var(--color-error);
    }

    .empty {
      text-align: center;
      padding: var(--spacing-lg);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `;

  @property({ type: Array }) logs: TaskRunLogRow[] = [];
  @state() private _expandedIds = new Set<number>();

  override render() {
    if (this.logs.length === 0) {
      return html`<div class="empty">No runs yet</div>`;
    }

    return html`
      <div class="timeline">
        ${this.logs.map(log => this._renderEntry(log))}
      </div>
    `;
  }

  private _renderEntry(log: TaskRunLogRow) {
    const isExpanded = this._expandedIds.has(log.id);
    const statusClass = log.status === 'success' ? 'success'
      : log.status === 'error' || log.status === 'failed' ? 'error'
      : 'running';
    const statusIcon = statusClass === 'success' ? '\u2713'
      : statusClass === 'error' ? '\u2717'
      : '\u25CF';

    const hasDetail = !!(log.result || log.error);

    return html`
      <div class="run-entry">
        <span class="status-icon ${statusClass}">${statusIcon}</span>
        <div
          class="run-header"
          @click=${() => hasDetail && this._toggleExpand(log.id)}
        >
          <span class="run-time">${relativeTime(log.run_at)}</span>
          <span class="run-duration">${this._formatDuration(log.duration_ms)}</span>
          <span class="run-status-label ${statusClass}">${log.status}</span>
          ${hasDetail
            ? html`<span class="expand-icon ${isExpanded ? 'expanded' : ''}">\u25B6</span>`
            : nothing}
        </div>
        ${isExpanded && log.error
          ? html`<div class="run-detail error-text">${log.error}</div>`
          : nothing}
        ${isExpanded && log.result && !log.error
          ? html`<div class="run-detail">${log.result}</div>`
          : nothing}
      </div>
    `;
  }

  private _toggleExpand(id: number): void {
    const newSet = new Set(this._expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    this._expandedIds = newSet;
  }

  private _formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60_000);
    const secs = Math.round((ms % 60_000) / 1000);
    return `${mins}m ${secs}s`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'run-history': RunHistory;
  }
}
