/**
 * <workflow-card> — Card showing a scheduled task summary.
 *
 * Displays task name (first line of prompt, max 60 chars), status badge,
 * schedule (human-readable cron), group, and next run time.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ScheduledTask } from '../api/types.js';
import { cronToHuman, relativeTime } from '../utils/format.js';

@customElement('workflow-card')
export class WorkflowCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
      cursor: pointer;
    }

    .card {
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      transition: border-color 0.15s, background 0.15s;
    }

    .card:hover {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-bg-secondary) 90%, var(--color-accent) 10%);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-sm);
      gap: var(--spacing-sm);
    }

    .name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      flex-shrink: 0;
    }

    .status-badge.active {
      background: color-mix(in srgb, var(--color-success) 15%, transparent);
      color: var(--color-success);
    }

    .status-badge.paused {
      background: color-mix(in srgb, var(--color-warning) 15%, transparent);
      color: var(--color-warning);
    }

    .status-badge.completed {
      background: var(--color-bg-tertiary);
      color: var(--color-text-muted);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-badge.active .status-dot { background: var(--color-success); }
    .status-badge.paused .status-dot { background: var(--color-warning); }
    .status-badge.completed .status-dot { background: var(--color-text-muted); }

    .details {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm) var(--spacing-md);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .detail-label {
      color: var(--color-text-muted);
    }

    @media (max-width: 768px) {
      .details {
        flex-direction: column;
        gap: var(--spacing-xs);
      }
    }
  `;

  @property({ type: Object }) task!: ScheduledTask;

  override render() {
    if (!this.task) return html``;

    const name = this._getTaskName();
    const statusClass = this.task.status || 'active';
    const schedule = this.task.schedule_type === 'cron'
      ? cronToHuman(this.task.schedule_value)
      : this.task.schedule_value;

    return html`
      <div class="card" @click=${this._handleClick}>
        <div class="header">
          <span class="name">${name}</span>
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${statusClass}
          </span>
        </div>
        <div class="details">
          <span class="detail-item">
            <span class="detail-label">Schedule:</span>
            ${schedule}
          </span>
          <span class="detail-item">
            <span class="detail-label">Group:</span>
            ${this.task.group_folder}
          </span>
          ${this.task.next_run
            ? html`
                <span class="detail-item">
                  <span class="detail-label">Next:</span>
                  ${relativeTime(this.task.next_run)}
                </span>
              `
            : ''}
        </div>
      </div>
    `;
  }

  private _getTaskName(): string {
    const firstLine = (this.task.prompt || this.task.name || 'Untitled').split('\n')[0];
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
  }

  private _handleClick(): void {
    this.dispatchEvent(
      new CustomEvent('workflow-select', {
        detail: { id: this.task.id },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'workflow-card': WorkflowCard;
  }
}
