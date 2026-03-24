/**
 * <workflows-page> — Workflow management (Town.com-inspired).
 *
 * List view: shows scheduled tasks with workflow cards.
 * Detail view: full task detail with controls, history, and settings.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store, GroupChangeEvent } from '../state/app-store.js';
import { ApiClient } from '../api/client.js';
import { router, RouteChangeEvent } from '../router.js';
import type { ScheduledTask, GroupInfo } from '../api/types.js';

import '../components/workflow-card.js';
import '../components/workflow-detail.js';

@customElement('workflows-page')
export class WorkflowsPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .count {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .empty {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .loading {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `;

  @state() private _tasks: ScheduledTask[] = [];
  @state() private _loading = false;
  @state() private _selectedId: string | null = null;
  @state() private _selectedTask: ScheduledTask | null = null;
  @state() private _activeGroup: GroupInfo | null = null;

  private _apiClient: ApiClient | null = null;

  private _groupHandler = () => {
    const newGroup = store.activeGroup;
    if (newGroup?.folder !== this._activeGroup?.folder) {
      this._activeGroup = newGroup;
      this._selectedId = null;
      this._selectedTask = null;
      this._loadTasks();
    }
  };

  private _routeHandler = (e: Event) => {
    const evt = e as RouteChangeEvent;
    if (evt.route.page === 'workflows' && evt.route.params.id) {
      this._selectTask(evt.route.params.id);
    } else if (evt.route.page === 'workflows') {
      this._selectedId = null;
      this._selectedTask = null;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();

    store.addEventListener('group-change', this._groupHandler);
    router.addEventListener('route-change', this._routeHandler);

    this._activeGroup = store.activeGroup;
    this._setupClient();
    this._loadTasks();

    // Check route params
    const route = router.current;
    if (route.page === 'workflows' && route.params.id) {
      this._selectTask(route.params.id);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    store.removeEventListener('group-change', this._groupHandler);
    router.removeEventListener('route-change', this._routeHandler);
  }

  override render() {
    if (this._selectedId && this._selectedTask) {
      return html`
        <workflow-detail
          .task=${this._selectedTask}
          .apiClient=${this._apiClient!}
          @workflow-back=${this._handleBack}
          @workflow-updated=${this._handleTaskUpdated}
          @workflow-deleted=${this._handleTaskDeleted}
        ></workflow-detail>
      `;
    }

    return this._renderList();
  }

  private _renderList() {
    return html`
      <div class="header">
        <span class="title">Workflows</span>
        ${this._tasks.length > 0
          ? html`<span class="count">${this._tasks.length} task${this._tasks.length !== 1 ? 's' : ''}</span>`
          : ''}
      </div>

      ${this._loading
        ? html`<div class="loading">Loading workflows...</div>`
        : this._tasks.length === 0
          ? html`<div class="empty">No scheduled tasks</div>`
          : html`
              <div class="task-list">
                ${this._tasks.map(
                  task => html`
                    <workflow-card
                      .task=${task}
                      @workflow-select=${(e: CustomEvent) => this._navigateToTask(e.detail.id)}
                    ></workflow-card>
                  `,
                )}
              </div>
            `}
    `;
  }

  // ── Actions ────────────────────────────────────────────────────

  private _navigateToTask(id: string): void {
    router.navigate(`/workflows/${encodeURIComponent(id)}`);
  }

  private async _selectTask(id: string): Promise<void> {
    this._selectedId = id;

    // Find in current list or fetch
    let task = this._tasks.find(t => t.id === id);
    if (!task && this._apiClient) {
      try {
        task = await this._apiClient.getTaskById(id);
      } catch (err) {
        console.error('Failed to load task:', err);
      }
    }
    this._selectedTask = task || null;
  }

  private _handleBack(): void {
    this._selectedId = null;
    this._selectedTask = null;
    router.navigate('/workflows');
  }

  private _handleTaskUpdated(e: CustomEvent<{ task: ScheduledTask }>): void {
    const updated = e.detail.task;
    this._selectedTask = updated;
    this._tasks = this._tasks.map(t => t.id === updated.id ? updated : t);
  }

  private _handleTaskDeleted(e: CustomEvent<{ id: string }>): void {
    this._tasks = this._tasks.filter(t => t.id !== e.detail.id);
    this._selectedId = null;
    this._selectedTask = null;
    router.navigate('/workflows');
  }

  // ── Data loading ────────────────────────────────────────────────

  private _setupClient(): void {
    const auth = store.authState;
    if (auth) {
      this._apiClient = new ApiClient(auth.url, auth.token);
    }
  }

  private async _loadTasks(): Promise<void> {
    if (!this._apiClient) return;

    this._loading = true;
    try {
      const result = await this._apiClient.getTasks(
        this._activeGroup?.folder,
        50,
        0,
      );
      this._tasks = result.data;
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      this._loading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'workflows-page': WorkflowsPage;
  }
}
