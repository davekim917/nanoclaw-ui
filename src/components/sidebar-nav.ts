/**
 * <sidebar-nav> — Navigation sidebar with capability-driven items.
 *
 * Desktop: 240px fixed sidebar.
 * Mobile: Hidden off-screen, slides in as overlay drawer with backdrop.
 * Hamburger toggle button exposed via CSS for the app-shell topbar.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { router } from '../router.js';
import type { Capabilities } from '../api/types.js';

interface NavItem {
  label: string;
  page: string;
  path: string;
  icon: string;
  featureKey?: keyof Capabilities['features'];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Chat', page: 'chat', path: '/chat', icon: '💬' },
  { label: 'Sessions', page: 'sessions', path: '/sessions', icon: '📋' },
  { label: 'Skills', page: 'skills', path: '/skills', icon: '⚡' },
  { label: 'Workflows', page: 'workflows', path: '/workflows', icon: '🔄' },
  { label: 'Memory', page: 'memory', path: '/memory', icon: '🧠', featureKey: 'memory' },
  { label: 'Backlog', page: 'backlog', path: '/backlog', icon: '📝', featureKey: 'backlog' },
  { label: 'Ship Log', page: 'shiplog', path: '/ship-log', icon: '🚀', featureKey: 'ship_log' },
];

@customElement('sidebar-nav')
export class SidebarNav extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 240px;
      min-height: 100%;
      background: var(--color-bg-secondary);
      border-right: 1px solid var(--color-border);
      padding: var(--spacing-sm) 0;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 50;
    }

    .backdrop {
      display: none;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-md) var(--spacing-lg);
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-accent);
    }

    .brand-icon {
      font-size: 1.25rem;
    }

    .brand-text {
      overflow: hidden;
      white-space: nowrap;
    }

    .close-btn {
      display: none;
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 var(--spacing-sm);
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 10px var(--spacing-md);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
      user-select: none;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: var(--font-sans);
    }

    .nav-item:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .nav-item.active {
      background: var(--color-accent-dim);
      color: var(--color-accent);
    }

    .nav-icon {
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      font-size: 1.125rem;
    }

    .nav-label {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .divider {
      height: 1px;
      background: var(--color-border);
      margin: var(--spacing-sm) var(--spacing-md);
    }

    .bottom {
      padding: var(--spacing-sm);
      border-top: 1px solid var(--color-border);
    }

    /* ── Mobile: slide-out drawer ─────────────────────────────── */
    @media (max-width: 768px) {
      :host {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 280px;
        transform: translateX(-100%);
        border-right: none;
        box-shadow: none;
      }

      :host([open]) {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
      }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: -1;
        opacity: 0;
        transition: opacity 0.25s ease;
        pointer-events: none;
      }

      :host([open]) .backdrop {
        opacity: 1;
        pointer-events: auto;
      }

      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: var(--radius-sm);
        background: none;
        color: var(--color-text-muted);
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: auto;
        transition: color 0.15s;
      }

      .close-btn:hover {
        color: var(--color-text-primary);
      }

      .brand {
        padding: var(--spacing-md) var(--spacing-md) var(--spacing-md);
      }

      .nav-item {
        padding: 12px var(--spacing-md);
        font-size: 0.9375rem;
      }

      .nav-icon {
        font-size: 1.25rem;
      }
    }
  `;

  @property({ type: Object }) capabilities?: Capabilities;
  @property() activePage?: string;
  @property({ type: Boolean, reflect: true }) open = false;

  override render() {
    const coreItems = NAV_ITEMS.filter(item => !item.featureKey);
    const conditionalItems = NAV_ITEMS.filter(item => {
      if (!item.featureKey) return false;
      if (!this.capabilities) return false;
      return this.capabilities.features[item.featureKey];
    });

    return html`
      <div class="backdrop" @click=${this._close}></div>

      <div class="brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-text">NanoClaw</span>
        <button class="close-btn" @click=${this._close} aria-label="Close menu">✕</button>
      </div>

      <nav>
        ${coreItems.map(item => this._renderNavItem(item))}
        ${conditionalItems.length > 0 ? html`<div class="divider"></div>` : nothing}
        ${conditionalItems.map(item => this._renderNavItem(item))}
      </nav>
    `;
  }

  private _renderNavItem(item: NavItem) {
    const isActive = this.activePage === item.page;
    return html`
      <button
        class="nav-item ${isActive ? 'active' : ''}"
        @click=${() => this._navigate(item.path)}
        aria-current=${isActive ? 'page' : 'false'}
      >
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </button>
    `;
  }

  private _navigate(path: string): void {
    router.navigate(path);
    // Close drawer on mobile after navigation
    this.open = false;
    this.dispatchEvent(new CustomEvent('sidebar-close', { bubbles: true, composed: true }));
  }

  private _close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent('sidebar-close', { bubbles: true, composed: true }));
  }

  /** Open the drawer (called from parent). */
  toggle(): void {
    this.open = !this.open;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sidebar-nav': SidebarNav;
  }
}
