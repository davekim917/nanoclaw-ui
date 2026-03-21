/**
 * <app-shell> — Root application component.
 *
 * Handles:
 * - Auth gate: shows <auth-form> if no saved credentials
 * - Layout: sidebar + main content area
 * - Route-change listener that swaps active page
 * - Mobile responsive (sidebar collapses to drawer at < 768px)
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { router, RouteChangeEvent } from './router.js';
import { store, AuthChangeEvent, CapabilitiesChangeEvent, GroupChangeEvent } from './state/app-store.js';
import { ApiClient } from './api/client.js';
import { WsClient } from './api/ws.js';
import type { Capabilities, GroupInfo } from './api/types.js';

// Import components (side-effects: register custom elements)
import './components/auth-form.js';
import './components/sidebar-nav.js';
import './components/group-picker.js';
import { NAV_ITEMS } from './components/sidebar-nav.js';
import { ICON_PATHS } from './utils/icons.js';

// Import pages
import './pages/chat-page.js';
import './pages/sessions-page.js';
import './pages/skills-page.js';
import './pages/workflows-page.js';

const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map(item => [item.page, item.label]),
);

@customElement('app-shell')
export class AppShell extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100vh;
      height: 100dvh;
      width: 100vw;
      overflow: hidden;
    }

    .app-layout {
      display: flex;
      height: 100%;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    /* ── Topbar ──────────────────────────────────── */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--spacing-lg);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      height: var(--topbar-height);
      flex-shrink: 0;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      min-width: 0;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-shrink: 0;
    }

    .hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: var(--radius-md);
      background: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      flex-shrink: 0;
      touch-action: manipulation;
      transition: color var(--transition-fast), background var(--transition-fast);
    }

    .hamburger:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
    }

    .hamburger svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
    }

    .page-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;
    }

    .disconnect-btn {
      padding: 6px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      background: none;
      color: var(--color-text-muted);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .disconnect-btn:hover {
      background: rgba(248, 113, 113, 0.1);
      border-color: var(--color-error);
      color: var(--color-error);
    }

    /* ── Page container ──────────────────────────── */
    .page-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .page-container > * {
      flex: 1;
      padding: var(--spacing-lg);
      animation: fadeIn 0.2s ease;
    }

    .page-stub {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-muted);
      gap: var(--spacing-md);
    }

    .page-stub-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-stub-icon svg {
      width: 24px;
      height: 24px;
      stroke: var(--color-text-muted);
      fill: none;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .page-stub-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .page-stub-desc {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    /* ── Loading ──────────────────────────────────── */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      height: 100dvh;
      gap: var(--spacing-md);
    }

    .loading-spinner {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--color-accent-gradient);
      animation: pulse 1.5s ease-in-out infinite;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-spinner svg {
      width: 18px;
      height: 18px;
      stroke: var(--color-text-inverse);
      fill: none;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.95); }
    }

    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* ── Mobile ─────────────────────────────────── */
    @media (max-width: 768px) {
      .topbar {
        padding: 0 var(--spacing-sm);
        height: 52px;
      }

      .topbar-left {
        gap: var(--spacing-xs);
      }

      .hamburger {
        display: flex;
      }

      .page-container > * {
        padding: var(--spacing-md);
      }

      .disconnect-btn {
        padding: 5px 10px;
        font-size: 0.6875rem;
      }
    }
  `;

  @state() private _authenticated = false;
  @state() private _loading = true;
  @state() private _activePage = 'chat';
  @state() private _capabilities: Capabilities | null = null;
  @state() private _activeGroup: GroupInfo | null = null;
  @state() private _sidebarOpen = false;

  private _apiClient: ApiClient | null = null;
  private _wsClient: WsClient | null = null;

  private _routeHandler = (e: Event) => {
    const evt = e as RouteChangeEvent;
    this._activePage = evt.route.page;
  };

  private _authHandler = () => {
    const auth = store.authState;
    this._authenticated = auth !== null && auth.connected;
    if (!this._authenticated) {
      this._cleanup();
    }
  };

  private _capsHandler = () => {
    this._capabilities = store.capabilities;
  };

  private _groupHandler = () => {
    this._activeGroup = store.activeGroup;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    router.addEventListener('route-change', this._routeHandler);
    store.addEventListener('auth-change', this._authHandler);
    store.addEventListener('capabilities-change', this._capsHandler);
    store.addEventListener('group-change', this._groupHandler);
    router.start();
    this._tryAutoConnect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    router.removeEventListener('route-change', this._routeHandler);
    store.removeEventListener('auth-change', this._authHandler);
    store.removeEventListener('capabilities-change', this._capsHandler);
    store.removeEventListener('group-change', this._groupHandler);
    router.stop();
    this._cleanup();
  }

  override render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <div class="loading-spinner">
            <svg viewBox="0 0 24 24"><path d="${ICON_PATHS.bolt}" /></svg>
          </div>
          <span class="loading-text">Connecting...</span>
        </div>
      `;
    }

    if (!this._authenticated) {
      return html`<auth-form></auth-form>`;
    }

    const pageTitle = PAGE_TITLES[this._activePage] || this._activePage;

    return html`
      <div class="app-layout">
        <sidebar-nav
          .capabilities=${this._capabilities}
          .activePage=${this._activePage}
          ?open=${this._sidebarOpen}
          @sidebar-close=${() => this._sidebarOpen = false}
        ></sidebar-nav>

        <div class="main-content">
          <div class="topbar">
            <div class="topbar-left">
              <button class="hamburger" @click=${() => this._sidebarOpen = true} aria-label="Open menu">
                <svg viewBox="0 0 24 24">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <span class="page-title">${pageTitle}</span>
              ${this._capabilities && this._capabilities.groups.length > 0
                ? html`
                    <group-picker
                      .groups=${this._capabilities.groups}
                      .selected=${this._activeGroup?.folder}
                    ></group-picker>
                  `
                : nothing}
            </div>
            <div class="topbar-right">
              <button class="disconnect-btn" @click=${this._handleDisconnect}>
                Disconnect
              </button>
            </div>
          </div>

          <div class="page-container">
            ${this._renderPage()}
          </div>
        </div>
      </div>
    `;
  }

  private _renderPage() {
    switch (this._activePage) {
      case 'chat':
        return html`<chat-page></chat-page>`;
      case 'sessions':
        return html`<sessions-page></sessions-page>`;
      case 'skills':
        return html`<skills-page></skills-page>`;
      case 'workflows':
        return html`<workflows-page></workflows-page>`;
      default:
        return html`<chat-page></chat-page>`;
    }
  }

  private async _tryAutoConnect(): Promise<void> {
    const auth = store.authState;
    if (!auth) {
      this._loading = false;
      return;
    }

    try {
      const client = new ApiClient(auth.url, auth.token);
      const capabilities = await client.getCapabilities();
      store.setAuth(auth.url, auth.token);
      store.setCapabilities(capabilities);

      this._apiClient = client;
      this._authenticated = true;
      this._capabilities = capabilities;
      this._activeGroup = store.activeGroup;

      this._wsClient = new WsClient(auth.url, auth.token);
      this._wsClient.apiClient = client;
      this._wsClient.connect();
    } catch {
      store.clearAuth();
      this._authenticated = false;
    } finally {
      this._loading = false;
    }
  }

  private _handleDisconnect(): void {
    this._cleanup();
    store.clearAuth();
  }

  private _cleanup(): void {
    if (this._wsClient) {
      this._wsClient.disconnect();
      this._wsClient = null;
    }
    this._apiClient = null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell;
  }
}
