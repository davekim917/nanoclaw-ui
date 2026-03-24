/**
 * <app-shell> — Root application component.
 *
 * Handles:
 * - Auth gate: shows <auth-form> if no saved credentials
 * - Layout: sidebar + main content area
 * - Route-change listener that swaps active page
 * - Mobile responsive (sidebar collapses to icons at < 768px)
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

// Import pages
import './pages/chat-page.js';
import './pages/sessions-page.js';
import './pages/skills-page.js';
import './pages/workflows-page.js';

@customElement('app-shell')
export class AppShell extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100vh;
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
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      min-height: 48px;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .page-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      text-transform: capitalize;
    }

    .disconnect-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text-secondary);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    .disconnect-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-error);
    }

    .page-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .page-container > * {
      flex: 1;
      padding: var(--spacing-lg);
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
      font-size: 3rem;
    }

    .page-stub-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .page-stub-desc {
      font-size: 0.875rem;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .topbar {
        padding: var(--spacing-xs) var(--spacing-sm);
      }
    }
  `;

  @state() private _authenticated = false;
  @state() private _loading = true;
  @state() private _activePage = 'chat';
  @state() private _capabilities: Capabilities | null = null;
  @state() private _activeGroup: GroupInfo | null = null;

  private _apiClient: ApiClient | null = null;
  private _wsClient: WsClient | null = null;

  // Event handler references for cleanup
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

    // Subscribe to state changes
    router.addEventListener('route-change', this._routeHandler);
    store.addEventListener('auth-change', this._authHandler);
    store.addEventListener('capabilities-change', this._capsHandler);
    store.addEventListener('group-change', this._groupHandler);

    // Start the router
    router.start();

    // Check for existing credentials and auto-connect
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
      return html`<div class="loading">Connecting...</div>`;
    }

    if (!this._authenticated) {
      return html`<auth-form></auth-form>`;
    }

    return html`
      <div class="app-layout">
        <sidebar-nav
          .capabilities=${this._capabilities}
          .activePage=${this._activePage}
        ></sidebar-nav>

        <div class="main-content">
          <div class="topbar">
            <div class="topbar-left">
              <span class="page-title">${this._activePage}</span>
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

      // Connect WebSocket
      this._wsClient = new WsClient(auth.url, auth.token);
      this._wsClient.apiClient = client;
      this._wsClient.connect();
    } catch {
      // Credentials invalid or server unreachable — show login
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
