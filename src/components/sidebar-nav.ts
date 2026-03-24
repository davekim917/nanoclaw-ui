/**
 * <sidebar-nav> — Navigation sidebar with capability-driven items.
 *
 * Always shows: Chat, Sessions, Skills, Workflows.
 * Conditionally shows: Memory, Backlog, Ship Log (based on capabilities).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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
      transition: width 0.2s ease;
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
      padding: var(--spacing-sm) var(--spacing-md);
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
      width: 20px;
      text-align: center;
      font-size: 1rem;
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

    /* Mobile: collapse to icons only */
    @media (max-width: 768px) {
      :host {
        width: 56px;
      }

      .brand-text,
      .nav-label {
        display: none;
      }

      .nav-item {
        justify-content: center;
        padding: var(--spacing-sm);
      }
    }
  `;

  @property({ type: Object }) capabilities?: Capabilities;
  @property() activePage?: string;

  override render() {
    const coreItems = NAV_ITEMS.filter(item => !item.featureKey);
    const conditionalItems = NAV_ITEMS.filter(item => {
      if (!item.featureKey) return false;
      if (!this.capabilities) return false;
      return this.capabilities.features[item.featureKey];
    });

    return html`
      <div class="brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-text">NanoClaw</span>
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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sidebar-nav': SidebarNav;
  }
}
