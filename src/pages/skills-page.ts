/**
 * <skills-page> — Skills marketplace with Installed and Marketplace tabs.
 *
 * Installed: loads from GET /api/skills/installed
 * Marketplace: search → GET /api/skills/marketplace?q=, install via POST /api/skills/install
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../state/app-store.js';
import { ApiClient } from '../api/client.js';
import { WsClient, WsSkillInstallProgressEvent } from '../api/ws.js';
import type { InstalledSkill, MarketplaceSkill } from '../api/types.js';

import '../components/skill-card.js';

const SEARCH_DEBOUNCE_MS = 300;

@customElement('skills-page')
export class SkillsPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .tabs {
      display: flex;
      gap: 0;
      margin-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }

    .tab {
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      background: none;
      color: var(--color-text-secondary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      margin-bottom: -1px;
    }

    .tab:hover {
      color: var(--color-text-primary);
    }

    .tab.active {
      color: var(--color-accent);
      border-bottom-color: var(--color-accent);
    }

    .search-bar {
      margin-bottom: var(--spacing-md);
    }

    .search-input {
      display: block;
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    .search-input:focus {
      border-color: var(--color-accent);
    }

    .search-input::placeholder {
      color: var(--color-text-muted);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--spacing-md);
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

    /* Restart notification */
    .restart-notification {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) var(--spacing-md);
      margin-bottom: var(--spacing-md);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-warning) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
      color: var(--color-warning);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .restart-text {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state() private _activeTab: 'installed' | 'marketplace' = 'installed';
  @state() private _installed: InstalledSkill[] = [];
  @state() private _marketplaceResults: MarketplaceSkill[] = [];
  @state() private _installedLoading = false;
  @state() private _searching = false;
  @state() private _searchQuery = '';
  @state() private _installing = new Map<string, string>(); // repo → status
  @state() private _needsRestart = false;

  private _apiClient: ApiClient | null = null;
  private _wsClient: WsClient | null = null;
  private _searchTimer: ReturnType<typeof setTimeout> | null = null;

  private _installProgressHandler = (e: Event) => {
    const evt = e as WsSkillInstallProgressEvent;
    this._onInstallProgress(evt);
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._setupClients();
    this._loadInstalled();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._wsClient) {
      this._wsClient.removeEventListener('ws-skill-install-progress', this._installProgressHandler);
      this._wsClient.disconnect();
      this._wsClient = null;
    }
  }

  override render() {
    return html`
      ${this._needsRestart
        ? html`
            <div class="restart-notification">
              <span class="restart-text">
                \u26A0 Restart NanoClaw to apply changes
              </span>
            </div>
          `
        : nothing}

      <div class="tabs">
        <button
          class="tab ${this._activeTab === 'installed' ? 'active' : ''}"
          @click=${() => this._switchTab('installed')}
        >
          Installed
        </button>
        <button
          class="tab ${this._activeTab === 'marketplace' ? 'active' : ''}"
          @click=${() => this._switchTab('marketplace')}
        >
          Marketplace
        </button>
      </div>

      ${this._activeTab === 'installed'
        ? this._renderInstalled()
        : this._renderMarketplace()}
    `;
  }

  private _renderInstalled() {
    if (this._installedLoading) {
      return html`<div class="loading">Loading installed skills...</div>`;
    }

    if (this._installed.length === 0) {
      return html`<div class="empty">No skills installed</div>`;
    }

    return html`
      <div class="grid">
        ${this._installed.map(
          skill => html`
            <skill-card
              .name=${skill.name}
              .description=${skill.description}
              .path=${skill.path}
              .group=${skill.group}
            ></skill-card>
          `,
        )}
      </div>
    `;
  }

  private _renderMarketplace() {
    return html`
      <div class="search-bar">
        <input
          class="search-input"
          type="text"
          placeholder="Search skills..."
          .value=${this._searchQuery}
          @input=${this._handleSearchInput}
        />
      </div>

      ${this._searching
        ? html`<div class="loading">Searching...</div>`
        : this._marketplaceResults.length === 0 && this._searchQuery
          ? html`<div class="empty">No skills found for "${this._searchQuery}"</div>`
          : this._marketplaceResults.length === 0
            ? html`<div class="empty">Search for skills to install</div>`
            : html`
                <div class="grid">
                  ${this._marketplaceResults.map(
                    skill => html`
                      <skill-card
                        .name=${skill.name}
                        .description=${skill.description}
                        .repo=${skill.repo}
                        .installs=${skill.installs}
                        .installable=${true}
                        .installStatus=${this._installing.get(skill.repo)}
                        @install-skill=${(e: CustomEvent) => this._handleInstall(e)}
                      ></skill-card>
                    `,
                  )}
                </div>
              `}
    `;
  }

  // ── Tab switching ──────────────────────────────────────────────

  private _switchTab(tab: 'installed' | 'marketplace'): void {
    this._activeTab = tab;
    if (tab === 'installed' && this._installed.length === 0) {
      this._loadInstalled();
    }
  }

  // ── Search ─────────────────────────────────────────────────────

  private _handleSearchInput(e: InputEvent): void {
    const value = (e.target as HTMLInputElement).value;
    this._searchQuery = value;

    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      if (value.trim()) {
        this._searchMarketplace(value.trim());
      } else {
        this._marketplaceResults = [];
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  // ── Install ────────────────────────────────────────────────────

  private async _handleInstall(e: CustomEvent<{ repo: string; name: string }>): Promise<void> {
    if (!this._apiClient) return;
    const { repo } = e.detail;

    const newMap = new Map(this._installing);
    newMap.set(repo, 'installing');
    this._installing = newMap;

    try {
      await this._apiClient.installSkill(repo);
      // Progress tracked via WS events
    } catch (err) {
      console.error('Failed to start skill install:', err);
      const errMap = new Map(this._installing);
      errMap.set(repo, 'failed');
      this._installing = errMap;
    }
  }

  private _onInstallProgress(e: WsSkillInstallProgressEvent): void {
    if (e.status === 'completed') {
      // Find which repo this jobId corresponds to (scan installing map)
      // For now, mark all installing as completed
      const newMap = new Map<string, string>();
      for (const [repo, status] of this._installing) {
        if (status === 'installing') {
          newMap.set(repo, 'completed');
        } else {
          newMap.set(repo, status);
        }
      }
      this._installing = newMap;
      this._needsRestart = true;
    } else if (e.status === 'failed') {
      const newMap = new Map<string, string>();
      for (const [repo, status] of this._installing) {
        if (status === 'installing') {
          newMap.set(repo, 'failed');
        } else {
          newMap.set(repo, status);
        }
      }
      this._installing = newMap;
    }
  }

  // ── Data loading ────────────────────────────────────────────────

  private _setupClients(): void {
    const auth = store.authState;
    if (!auth) return;

    this._apiClient = new ApiClient(auth.url, auth.token);
    this._wsClient = new WsClient(auth.url, auth.token);
    this._wsClient.apiClient = this._apiClient;
    this._wsClient.connect();
    this._wsClient.addEventListener('ws-skill-install-progress', this._installProgressHandler);
  }

  private async _loadInstalled(): Promise<void> {
    if (!this._apiClient) return;

    this._installedLoading = true;
    try {
      const result = await this._apiClient.getInstalledSkills();
      this._installed = result.data;
    } catch (err) {
      console.error('Failed to load installed skills:', err);
    } finally {
      this._installedLoading = false;
    }
  }

  private async _searchMarketplace(query: string): Promise<void> {
    if (!this._apiClient) return;

    this._searching = true;
    try {
      const result = await this._apiClient.searchMarketplace(query);
      this._marketplaceResults = result.data;
    } catch (err) {
      console.error('Failed to search marketplace:', err);
      this._marketplaceResults = [];
    } finally {
      this._searching = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'skills-page': SkillsPage;
  }
}
