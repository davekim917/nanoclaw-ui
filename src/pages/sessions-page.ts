/**
 * <sessions-page> — Conversation history browser.
 *
 * Lists past sessions with search, pagination, and detail view.
 * Reuses <chat-message> for session message display.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store, GroupChangeEvent } from '../state/app-store.js';
import { ApiClient } from '../api/client.js';
import { router, RouteChangeEvent } from '../router.js';
import type { SessionV2Full, Message, GroupInfo } from '../api/types.js';
import { relativeTime } from '../utils/format.js';

// Import <chat-message> for session detail view
import '../components/chat-message.js';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@customElement('sessions-page')
export class SessionsPage extends LitElement {
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
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .search-input {
      padding: var(--spacing-xs) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      outline: none;
      min-width: 200px;
      transition: border-color 0.15s;
    }

    .search-input:focus {
      border-color: var(--color-accent);
    }

    .search-input::placeholder {
      color: var(--color-text-muted);
    }

    /* Session list */
    .session-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .session-card {
      padding: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }

    .session-card:hover {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-bg-secondary) 90%, var(--color-accent) 10%);
    }

    .session-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-xs);
    }

    .session-key {
      font-size: 0.8125rem;
      font-family: var(--font-mono);
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 60%;
    }

    .session-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .session-meta {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .badge.model {
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
    }

    .badge.effort {
      background: var(--color-accent-dim);
      color: var(--color-accent);
    }

    .badge.processing {
      background: color-mix(in srgb, var(--color-accent) 15%, transparent);
      color: var(--color-accent);
      animation: pulse-badge 2s infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .badge.group {
      background: var(--color-bg-tertiary);
      color: var(--color-text-muted);
    }

    /* Load more */
    .load-more {
      display: block;
      width: 100%;
      padding: var(--spacing-sm);
      margin-top: var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }

    .load-more:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    /* Detail view */
    .detail-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
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
      transition: color 0.15s;
    }

    .back-btn:hover {
      color: var(--color-accent);
    }

    .detail-key {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-text-primary);
    }

    .messages-container {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* Empty / loading states */
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

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
      }

      .search-input {
        min-width: unset;
      }
    }
  `;

  @state() private _sessions: SessionV2Full[] = [];
  @state() private _total = 0;
  @state() private _loading = false;
  @state() private _selectedKey: string | null = null;
  @state() private _detailMessages: Message[] = [];
  @state() private _detailLoading = false;
  @state() private _searchQuery = '';
  @state() private _activeGroup: GroupInfo | null = null;

  private _apiClient: ApiClient | null = null;
  private _searchTimer: ReturnType<typeof setTimeout> | null = null;
  private _relativeTimeInterval: ReturnType<typeof setInterval> | null = null;

  // Event handlers
  private _groupHandler = () => {
    const newGroup = store.activeGroup;
    if (newGroup?.folder !== this._activeGroup?.folder) {
      this._activeGroup = newGroup;
      this._sessions = [];
      this._total = 0;
      this._selectedKey = null;
      this._searchQuery = '';
      this._loadSessions();
    }
  };

  private _routeHandler = (e: Event) => {
    const evt = e as RouteChangeEvent;
    if (evt.route.page === 'sessions' && evt.route.params.key) {
      this._selectSession(decodeURIComponent(evt.route.params.key));
    } else if (evt.route.page === 'sessions') {
      this._selectedKey = null;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();

    store.addEventListener('group-change', this._groupHandler);
    router.addEventListener('route-change', this._routeHandler);

    this._activeGroup = store.activeGroup;
    this._setupClient();
    this._loadSessions();

    // Update relative timestamps every minute
    this._relativeTimeInterval = setInterval(() => this.requestUpdate(), 60_000);

    // Check route params
    const route = router.current;
    if (route.page === 'sessions' && route.params.key) {
      this._selectSession(decodeURIComponent(route.params.key));
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    store.removeEventListener('group-change', this._groupHandler);
    router.removeEventListener('route-change', this._routeHandler);
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._relativeTimeInterval) clearInterval(this._relativeTimeInterval);
  }

  override render() {
    if (this._selectedKey) {
      return this._renderDetail();
    }
    return this._renderList();
  }

  private _renderList() {
    return html`
      <div class="header">
        <span class="title">Sessions</span>
        <input
          class="search-input"
          type="text"
          placeholder="Search conversations..."
          .value=${this._searchQuery}
          @input=${this._handleSearchInput}
        />
      </div>

      ${this._loading
        ? html`<div class="loading">Loading sessions...</div>`
        : this._sessions.length === 0
          ? html`<div class="empty">
              ${this._searchQuery
                ? `No sessions found for "${this._searchQuery}"`
                : 'No sessions yet'}
            </div>`
          : html`
              <div class="session-list">
                ${this._sessions.map(session => this._renderSessionCard(session))}
              </div>
              ${this._sessions.length < this._total
                ? html`
                    <button class="load-more" @click=${this._loadMore}>
                      Load more (${this._total - this._sessions.length} remaining)
                    </button>
                  `
                : nothing}
            `}
    `;
  }

  private _renderSessionCard(session: SessionV2Full) {
    return html`
      <div
        class="session-card"
        @click=${() => this._navigateToSession(session.session_key)}
      >
        <div class="session-top">
          <span class="session-key">${session.session_key}</span>
          <span class="session-time">${relativeTime(session.last_activity)}</span>
        </div>
        <div class="session-meta">
          <span class="badge group">${session.group_folder}</span>
          ${session.model
            ? html`<span class="badge model">${session.model}</span>`
            : nothing}
          ${session.effort
            ? html`<span class="badge effort">${session.effort}</span>`
            : nothing}
          ${session.processing === 1
            ? html`<span class="badge processing">Processing</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderDetail() {
    return html`
      <div class="detail-header">
        <button class="back-btn" @click=${this._goBack}>\u2190 Back</button>
        <span class="detail-key">${this._selectedKey}</span>
      </div>

      ${this._detailLoading
        ? html`<div class="loading">Loading messages...</div>`
        : this._detailMessages.length === 0
          ? html`<div class="empty">No messages in this session</div>`
          : html`
              <div class="messages-container">
                ${this._detailMessages.map(
                  msg => html`
                    <chat-message
                      .content=${msg.text}
                      .sender=${msg.sender_name}
                      .isUser=${msg.is_from_me === 1}
                      .timestamp=${msg.timestamp}
                    ></chat-message>
                  `,
                )}
              </div>
            `}
    `;
  }

  // ── Actions ────────────────────────────────────────────────────

  private _handleSearchInput(e: InputEvent): void {
    const value = (e.target as HTMLInputElement).value;
    this._searchQuery = value;

    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this._sessions = [];
      this._total = 0;
      this._loadSessions();
    }, SEARCH_DEBOUNCE_MS);
  }

  private _navigateToSession(key: string): void {
    router.navigate(`/sessions/${encodeURIComponent(key)}`);
  }

  private _selectSession(key: string): void {
    this._selectedKey = key;
    this._loadSessionMessages(key);
  }

  private _goBack(): void {
    this._selectedKey = null;
    router.navigate('/sessions');
  }

  private async _loadMore(): Promise<void> {
    if (!this._apiClient || !this._activeGroup) return;
    try {
      const result = await this._apiClient.getSessionHistory(
        this._activeGroup.folder,
        PAGE_SIZE,
        this._sessions.length,
      );
      this._sessions = [...this._sessions, ...result.data];
      this._total = result.total;
    } catch (err) {
      console.error('Failed to load more sessions:', err);
    }
  }

  // ── Data loading ────────────────────────────────────────────────

  private _setupClient(): void {
    const auth = store.authState;
    if (auth) {
      this._apiClient = new ApiClient(auth.url, auth.token);
    }
  }

  private async _loadSessions(): Promise<void> {
    if (!this._apiClient || !this._activeGroup) return;

    this._loading = true;
    try {
      if (this._searchQuery.trim()) {
        const results = await this._apiClient.searchThreads(
          this._activeGroup.folder,
          this._searchQuery.trim(),
        );
        // Map thread search results to session-like display
        // For search, we show what we can — the search returns thread_ids
        // We still load sessions for the group and let the search filter
        const sessionResult = await this._apiClient.getSessionHistory(
          this._activeGroup.folder,
          100,
          0,
        );
        this._sessions = sessionResult.data;
        this._total = sessionResult.total;
      } else {
        const result = await this._apiClient.getSessionHistory(
          this._activeGroup.folder,
          PAGE_SIZE,
          0,
        );
        this._sessions = result.data;
        this._total = result.total;
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      this._loading = false;
    }
  }

  private async _loadSessionMessages(key: string): Promise<void> {
    if (!this._apiClient) return;

    this._detailLoading = true;
    try {
      const result = await this._apiClient.getSessionMessages(key, 100, 0);
      this._detailMessages = result.data;
    } catch (err) {
      console.error('Failed to load session messages:', err);
      this._detailMessages = [];
    } finally {
      this._detailLoading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sessions-page': SessionsPage;
  }
}
