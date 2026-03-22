/**
 * <workflow-detail> — Full detail view for a scheduled task (Town.com-inspired).
 *
 * Shows header, schedule, controls (pause/resume/edit/delete),
 * run history, settings, and autonomy toggle placeholder.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ScheduledTask, TaskRunLogRow } from '../api/types.js';
import { ApiClient } from '../api/client.js';
import { cronToHuman, relativeTime } from '../utils/format.js';
import { ICON_PATHS } from '../utils/icons.js';
import './run-history.js';

@customElement('workflow-detail')
export class WorkflowDetail extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      border: none;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text-secondary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      cursor: pointer;
      margin-bottom: var(--spacing-md);
      transition: color 0.15s;
    }

    .back-btn:hover {
      color: var(--color-accent);
    }

    /* Header */
    .detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .header-left {
      flex: 1;
    }

    .task-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
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

    /* Sections */
    .section {
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
    }

    .section-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--spacing-md);
    }

    /* Schedule section */
    .schedule-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--spacing-xs) var(--spacing-md);
      font-size: 0.875rem;
    }

    .schedule-label {
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .schedule-value {
      color: var(--color-text-primary);
    }

    .cron-raw {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    /* Controls */
    .controls {
      display: flex;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }

    .control-btn {
      padding: var(--spacing-xs) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }

    .control-btn:hover {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
    }

    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-btn.primary {
      background: var(--color-accent);
      color: var(--color-bg-primary);
      border-color: var(--color-accent);
    }

    .control-btn.primary:hover {
      background: var(--color-accent-hover);
    }

    .control-btn.danger {
      color: var(--color-error);
      border-color: var(--color-error);
    }

    .control-btn.danger:hover {
      background: color-mix(in srgb, var(--color-error) 10%, transparent);
    }

    /* Settings / Edit mode */
    .settings-field {
      margin-bottom: var(--spacing-md);
    }

    .settings-field:last-child {
      margin-bottom: 0;
    }

    .settings-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    .settings-textarea {
      display: block;
      width: 100%;
      min-height: 100px;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.5;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
    }

    .settings-textarea:focus {
      border-color: var(--color-accent);
    }

    .settings-input {
      display: block;
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      outline: none;
      box-sizing: border-box;
    }

    .settings-input:focus {
      border-color: var(--color-accent);
    }

    .settings-text {
      font-size: 0.875rem;
      color: var(--color-text-primary);
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .settings-value {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-text-primary);
    }

    /* Autonomy placeholder */
    .autonomy-placeholder {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      background: var(--color-bg-tertiary);
      opacity: 0.5;
    }

    .autonomy-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .autonomy-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }

    /* Confirmation dialog */
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .confirm-dialog {
      padding: var(--spacing-lg);
      border-radius: var(--radius-lg);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      max-width: 400px;
      width: 90%;
    }

    .confirm-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: var(--spacing-sm);
    }

    .confirm-text {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-lg);
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: var(--spacing-lg);
      color: var(--color-text-muted);
    }

    .edit-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
    }

    /* ── Mobile ─────────────────────────────────────── */
    @media (max-width: 768px) {
      .detail-header {
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .task-name {
        font-size: 1.125rem;
      }

      .schedule-grid {
        grid-template-columns: 1fr;
        gap: var(--spacing-xs);
      }

      .schedule-label {
        margin-top: var(--spacing-sm);
      }

      .schedule-label:first-child {
        margin-top: 0;
      }

      .controls {
        flex-direction: column;
      }

      .control-btn {
        text-align: center;
      }

      .section {
        padding: var(--spacing-sm) var(--spacing-md);
      }

      .confirm-dialog {
        margin: var(--spacing-md);
      }
    }
  `;

  @property({ type: Object }) task!: ScheduledTask;
  @property({ type: Object }) apiClient!: ApiClient;

  @state() private _logs: TaskRunLogRow[] = [];
  @state() private _logsTotal = 0;
  @state() private _logsLoading = false;
  @state() private _editing = false;
  @state() private _editPrompt = '';
  @state() private _editScheduleValue = '';
  @state() private _actionLoading = false;
  @state() private _confirmDelete = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.task) {
      this._loadLogs();
    }
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('task') && this.task) {
      this._loadLogs();
    }
  }

  override render() {
    if (!this.task) {
      return html`<div class="loading">Loading...</div>`;
    }

    const name = this._getTaskName();
    const statusClass = this.task.status || 'active';

    return html`
      <button class="back-btn" @click=${this._handleBack}>
            <svg viewBox="0 0 24 24" width="16" height="16" style="stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="${ICON_PATHS.arrowLeft}" /></svg>
            Back to list
          </button>

      <div class="detail-header">
        <div class="header-left">
          <div class="task-name">${name}</div>
          <div class="header-meta">
            <span class="status-badge ${statusClass}">${statusClass}</span>
            <span>${this.task.group_folder}</span>
          </div>
        </div>
      </div>

      <!-- Schedule -->
      <div class="section">
        <div class="section-title">Schedule</div>
        <div class="schedule-grid">
          <span class="schedule-label">Expression:</span>
          <span class="schedule-value">
            ${this.task.schedule_type === 'cron' ? cronToHuman(this.task.schedule_value) : this.task.schedule_value}
            ${this.task.schedule_type === 'cron'
              ? html`<span class="cron-raw">(${this.task.schedule_value})</span>`
              : nothing}
          </span>
          <span class="schedule-label">Timezone:</span>
          <span class="schedule-value">${this.task.timezone || 'UTC'}</span>
          <span class="schedule-label">Next run:</span>
          <span class="schedule-value">
            ${this.task.next_run ? relativeTime(this.task.next_run) : 'Not scheduled'}
          </span>
          ${this.task.last_run
            ? html`
                <span class="schedule-label">Last run:</span>
                <span class="schedule-value">${relativeTime(this.task.last_run)}</span>
              `
            : nothing}
        </div>
      </div>

      <!-- Controls -->
      <div class="section">
        <div class="section-title">Controls</div>
        <div class="controls">
          ${this.task.status === 'paused'
            ? html`<button class="control-btn primary" ?disabled=${this._actionLoading} @click=${this._handleResume}>Resume</button>`
            : html`<button class="control-btn" ?disabled=${this._actionLoading} @click=${this._handlePause}>Pause</button>`}
          <button class="control-btn" ?disabled=${this._actionLoading} @click=${this._startEditing}>Edit</button>
          <button class="control-btn danger" ?disabled=${this._actionLoading} @click=${() => this._confirmDelete = true}>Delete</button>
        </div>
      </div>

      <!-- Settings -->
      <div class="section">
        <div class="section-title">Settings</div>
        ${this._editing ? this._renderEditMode() : this._renderViewMode()}
      </div>

      <!-- Run History -->
      <div class="section">
        <div class="section-title">Run History</div>
        ${this._logsLoading
          ? html`<div class="loading">Loading runs...</div>`
          : html`<run-history .logs=${this._logs}></run-history>`}
        ${this._logsTotal > this._logs.length
          ? html`
              <button
                class="control-btn"
                style="margin-top: var(--spacing-md); width: 100%"
                @click=${this._loadMoreLogs}
              >
                Load more (${this._logsTotal - this._logs.length} remaining)
              </button>
            `
          : nothing}
      </div>

      <!-- Autonomy Toggle Placeholder -->
      <div class="section">
        <div class="section-title">Autonomy</div>
        <div class="autonomy-placeholder">
          <span class="autonomy-label">Autonomous execution mode</span>
          <span class="autonomy-badge">Phase 2</span>
        </div>
      </div>

      ${this._confirmDelete ? this._renderDeleteConfirmation() : nothing}
    `;
  }

  private _renderViewMode() {
    return html`
      <div class="settings-field">
        <span class="settings-label">Prompt</span>
        <div class="settings-text">${this.task.prompt}</div>
      </div>
      <div class="settings-field">
        <span class="settings-label">Schedule Type</span>
        <div class="settings-value">${this.task.schedule_type}</div>
      </div>
      <div class="settings-field">
        <span class="settings-label">Schedule Value</span>
        <div class="settings-value">${this.task.schedule_value}</div>
      </div>
      <div class="settings-field">
        <span class="settings-label">Context Mode</span>
        <div class="settings-value">${this.task.context_mode || 'group'}</div>
      </div>
    `;
  }

  private _renderEditMode() {
    return html`
      <div class="settings-field">
        <label class="settings-label" for="edit-prompt">Prompt</label>
        <textarea
          id="edit-prompt"
          class="settings-textarea"
          .value=${this._editPrompt}
          @input=${(e: InputEvent) => this._editPrompt = (e.target as HTMLTextAreaElement).value}
        ></textarea>
      </div>
      <div class="settings-field">
        <label class="settings-label" for="edit-schedule">Schedule Value</label>
        <input
          id="edit-schedule"
          class="settings-input"
          .value=${this._editScheduleValue}
          @input=${(e: InputEvent) => this._editScheduleValue = (e.target as HTMLInputElement).value}
        />
      </div>
      <div class="edit-actions">
        <button class="control-btn primary" ?disabled=${this._actionLoading} @click=${this._saveEdit}>Save</button>
        <button class="control-btn" @click=${this._cancelEditing}>Cancel</button>
      </div>
    `;
  }

  private _renderDeleteConfirmation() {
    return html`
      <div class="confirm-overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this._confirmDelete = false; }}>
        <div class="confirm-dialog">
          <div class="confirm-title">Delete Task</div>
          <div class="confirm-text">
            Are you sure you want to delete this task? This action cannot be undone.
          </div>
          <div class="confirm-actions">
            <button class="control-btn" @click=${() => this._confirmDelete = false}>Cancel</button>
            <button class="control-btn danger" ?disabled=${this._actionLoading} @click=${this._handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Actions ────────────────────────────────────────────────────

  private async _handlePause(): Promise<void> {
    if (!this.apiClient) return;
    this._actionLoading = true;
    try {
      const updated = await this.apiClient.pauseTask(this.task.id);
      this._dispatchTaskUpdate(updated);
    } catch (err) {
      console.error('Failed to pause task:', err);
    } finally {
      this._actionLoading = false;
    }
  }

  private async _handleResume(): Promise<void> {
    if (!this.apiClient) return;
    this._actionLoading = true;
    try {
      const updated = await this.apiClient.resumeTask(this.task.id);
      this._dispatchTaskUpdate(updated);
    } catch (err) {
      console.error('Failed to resume task:', err);
    } finally {
      this._actionLoading = false;
    }
  }

  private _startEditing(): void {
    this._editPrompt = this.task.prompt;
    this._editScheduleValue = this.task.schedule_value;
    this._editing = true;
  }

  private _cancelEditing(): void {
    this._editing = false;
  }

  private async _saveEdit(): Promise<void> {
    if (!this.apiClient) return;
    this._actionLoading = true;
    try {
      const updated = await this.apiClient.updateTask(this.task.id, {
        prompt: this._editPrompt,
        schedule_value: this._editScheduleValue,
      });
      this._editing = false;
      this._dispatchTaskUpdate(updated);
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      this._actionLoading = false;
    }
  }

  private async _handleDelete(): Promise<void> {
    if (!this.apiClient) return;
    this._actionLoading = true;
    try {
      await this.apiClient.deleteTask(this.task.id);
      this._confirmDelete = false;
      this.dispatchEvent(
        new CustomEvent('workflow-deleted', {
          detail: { id: this.task.id },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      this._actionLoading = false;
    }
  }

  // ── Data loading ───────────────────────────────────────────────

  private async _loadLogs(): Promise<void> {
    if (!this.apiClient || !this.task) return;
    this._logsLoading = true;
    try {
      const result = await this.apiClient.getTaskLogs(this.task.id, 20, 0);
      this._logs = result.data;
      this._logsTotal = result.total;
    } catch (err) {
      console.error('Failed to load task logs:', err);
    } finally {
      this._logsLoading = false;
    }
  }

  private async _loadMoreLogs(): Promise<void> {
    if (!this.apiClient || !this.task) return;
    try {
      const result = await this.apiClient.getTaskLogs(
        this.task.id,
        20,
        this._logs.length,
      );
      this._logs = [...this._logs, ...result.data];
      this._logsTotal = result.total;
    } catch (err) {
      console.error('Failed to load more logs:', err);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────

  private _getTaskName(): string {
    const firstLine = (this.task.prompt || this.task.name || 'Untitled').split('\n')[0];
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
  }

  private _handleBack(): void {
    this.dispatchEvent(
      new CustomEvent('workflow-back', { bubbles: true, composed: true }),
    );
  }

  private _dispatchTaskUpdate(updated: ScheduledTask): void {
    this.dispatchEvent(
      new CustomEvent('workflow-updated', {
        detail: { task: updated },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'workflow-detail': WorkflowDetail;
  }
}
