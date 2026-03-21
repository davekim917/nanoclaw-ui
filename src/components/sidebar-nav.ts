/**
 * <sidebar-nav> — Navigation sidebar with capability-driven items.
 *
 * Desktop: 260px fixed sidebar with refined visual hierarchy.
 * Mobile: Hidden off-screen, slides in as overlay drawer with backdrop.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { router } from '../router.js';
import type { Capabilities } from '../api/types.js';

interface NavItem {
  label: string;
  page: string;
  path: string;
  icon: string; // SVG path data
  featureKey?: keyof Capabilities['features'];
}

// Clean SVG icon paths (24x24 viewbox, stroke-based)
const ICONS = {
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  sessions: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  skills: 'M13 10V3L4 14h7v7l9-11h-7z',
  workflows: 'M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15',
  memory: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  backlog: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4',
  shiplog: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Chat', page: 'chat', path: '/chat', icon: ICONS.chat },
  { label: 'Sessions', page: 'sessions', path: '/sessions', icon: ICONS.sessions },
  { label: 'Skills', page: 'skills', path: '/skills', icon: ICONS.skills },
  { label: 'Workflows', page: 'workflows', path: '/workflows', icon: ICONS.workflows },
  { label: 'Memory', page: 'memory', path: '/memory', icon: ICONS.memory, featureKey: 'memory' },
  { label: 'Backlog', page: 'backlog', path: '/backlog', icon: ICONS.backlog, featureKey: 'backlog' },
  { label: 'Ship Log', page: 'shiplog', path: '/ship-log', icon: ICONS.shiplog, featureKey: 'ship_log' },
];

@customElement('sidebar-nav')
export class SidebarNav extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: var(--sidebar-width);
      min-height: 100%;
      background: var(--color-bg-secondary);
      border-right: 1px solid var(--color-border);
      transition: transform var(--transition-slow);
      z-index: 50;
    }

    .backdrop {
      display: none;
    }

    /* ── Brand ─────────────────────────────────────── */
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
    }

    .brand-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      background: var(--color-accent-gradient);
      box-shadow: var(--shadow-glow);
      flex-shrink: 0;
    }

    .brand-logo svg {
      width: 18px;
      height: 18px;
      stroke: var(--color-text-inverse);
      fill: none;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .brand-text {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--color-text-primary);
      letter-spacing: -0.02em;
      overflow: hidden;
      white-space: nowrap;
    }

    .close-btn {
      display: none;
    }

    /* ── Navigation ─────────────────────────────────── */
    nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--spacing-sm) var(--spacing-sm) 0;
      flex: 1;
    }

    .nav-section-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: var(--spacing-md) var(--spacing-md) var(--spacing-xs);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px var(--spacing-md);
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background var(--transition-fast), color var(--transition-fast);
      user-select: none;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: var(--font-sans);
      position: relative;
    }

    .nav-item:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .nav-item.active {
      background: var(--color-accent-dim);
      color: var(--color-accent);
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      border-radius: 0 3px 3px 0;
      background: var(--color-accent);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    .nav-icon svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
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

    /* ── Bottom section ─────────────────────────────── */
    .bottom {
      padding: var(--spacing-md);
      border-top: 1px solid var(--color-border);
    }

    .version {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      text-align: center;
    }

    /* ── Mobile: slide-out drawer ─────────────────── */
    @media (max-width: 768px) {
      :host {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: var(--sidebar-width-mobile);
        transform: translateX(-100%);
        border-right: none;
        box-shadow: none;
      }

      :host([open]) {
        transform: translateX(0);
        box-shadow: var(--shadow-xl);
      }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: -1;
        opacity: 0;
        transition: opacity var(--transition-slow);
        pointer-events: none;
      }

      :host([open]) .backdrop {
        opacity: 1;
        pointer-events: auto;
      }

      .brand {
        padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
      }

      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: var(--radius-md);
        background: none;
        color: var(--color-text-muted);
        cursor: pointer;
        margin-left: auto;
        transition: color var(--transition-fast), background var(--transition-fast);
      }

      .close-btn:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
      }

      .close-btn svg {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
      }

      .nav-item {
        padding: 12px var(--spacing-md);
        font-size: 0.9375rem;
      }
    }
  `;

  @property({ type: Object }) capabilities?: Capabilities;
  @property() activePage?: string;
  @property({ type: Boolean, reflect: true }) open = false;

  private _keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this._close();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = this.shadowRoot?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === this && this.shadowRoot?.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && this.shadowRoot?.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      if (this.open) {
        document.addEventListener('keydown', this._keydownHandler);
        requestAnimationFrame(() => {
          const closeBtn = this.shadowRoot?.querySelector<HTMLElement>('.close-btn');
          closeBtn?.focus();
        });
      } else {
        document.removeEventListener('keydown', this._keydownHandler);
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._keydownHandler);
  }

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
        <div class="brand-logo">
          <svg viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span class="brand-text">NanoClaw</span>
        <button class="close-btn" @click=${this._close} aria-label="Close menu">
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav>
        ${coreItems.map(item => this._renderNavItem(item))}
        ${conditionalItems.length > 0
          ? html`
              <div class="divider"></div>
              <span class="nav-section-label">Insights</span>
              ${conditionalItems.map(item => this._renderNavItem(item))}
            `
          : nothing}
      </nav>

      <div class="bottom">
        <div class="version">NanoClaw UI v0.2.0</div>
      </div>
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
        <span class="nav-icon">
          <svg viewBox="0 0 24 24">
            <path d="${item.icon}" />
          </svg>
        </span>
        <span class="nav-label">${item.label}</span>
      </button>
    `;
  }

  private _navigate(path: string): void {
    router.navigate(path);
    this._emitClose();
  }

  private _close(): void {
    this._emitClose();
  }

  private _emitClose(): void {
    this.dispatchEvent(new CustomEvent('sidebar-close', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sidebar-nav': SidebarNav;
  }
}
