/**
 * <group-picker> — Custom dropdown for selecting the active NanoClaw group.
 *
 * Groups are organized by channel type (Discord, Slack, WhatsApp, Telegram).
 * Includes "All Groups" option for admin cross-group view.
 * Supports keyboard navigation (Arrow Up/Down, Enter, Escape).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GroupInfo } from '../api/types.js';
import { store } from '../state/app-store.js';
import { ICON_PATHS } from '../utils/icons.js';

/** Channel display metadata. */
const CHANNEL_META: Record<string, { label: string; color: string }> = {
  discord: { label: 'Discord', color: '#5865F2' },
  slack: { label: 'Slack', color: '#E01E5A' },
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  telegram: { label: 'Telegram', color: '#26A5E4' },
  unknown: { label: 'Other', color: '#888' },
};

/** Sort order for channel sections. */
const CHANNEL_ORDER = ['discord', 'slack', 'whatsapp', 'telegram', 'unknown'];

@customElement('group-picker')
export class GroupPicker extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }

    .picker {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .picker-trigger {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 5px var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      cursor: pointer;
      min-width: 160px;
      transition: border-color var(--transition-fast);
      outline: none;
    }

    .picker-trigger:hover,
    .picker-trigger:focus-visible {
      border-color: var(--color-accent);
    }

    .picker-value {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .channel-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .picker-chevron {
      display: flex;
      color: var(--color-text-muted);
      transition: transform var(--transition-fast);
    }

    .picker-chevron.open {
      transform: rotate(180deg);
    }

    .picker-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 220px;
      max-height: 360px;
      overflow-y: auto;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 60;
      padding: var(--spacing-xs) 0;
    }

    /* All Groups option */
    .all-groups-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: 8px var(--spacing-md);
      border: none;
      background: none;
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .all-groups-option:hover,
    .all-groups-option.focused {
      background: var(--color-bg-tertiary);
    }

    .all-groups-option.selected {
      color: var(--color-accent);
      background: var(--color-accent-dim);
    }

    .all-groups-option svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .divider {
      height: 1px;
      background: var(--color-border);
      margin: var(--spacing-xs) 0;
    }

    /* Channel section header */
    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px var(--spacing-md) 2px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .section-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .picker-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      width: 100%;
      padding: 6px var(--spacing-md) 6px calc(var(--spacing-md) + 12px);
      border: none;
      background: none;
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      text-align: left;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .picker-option:hover,
    .picker-option.focused {
      background: var(--color-bg-tertiary);
    }

    .picker-option.selected {
      color: var(--color-accent);
      background: var(--color-accent-dim);
    }

    .option-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .picker-trigger {
        min-width: 0;
        max-width: 140px;
        font-size: 0.75rem;
        padding: 4px 6px;
      }
    }
  `;

  @property({ type: Array }) groups: GroupInfo[] = [];
  @property() selected?: string; // folder name, or undefined for "all"
  @state() private _open = false;
  @state() private _focusedIndex = -1;

  private _outsideClickHandler = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._open = false;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._outsideClickHandler, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this._outsideClickHandler, true);
  }

  /** Groups organized by channel type. */
  private get _groupedByChannel(): Array<{
    channel: string;
    label: string;
    color: string;
    groups: GroupInfo[];
  }> {
    const byChannel = new Map<string, GroupInfo[]>();
    for (const g of this.groups) {
      const ch = g.channel || 'unknown';
      if (!byChannel.has(ch)) byChannel.set(ch, []);
      byChannel.get(ch)!.push(g);
    }

    return CHANNEL_ORDER
      .filter(ch => byChannel.has(ch))
      .map(ch => ({
        channel: ch,
        label: CHANNEL_META[ch]?.label || ch,
        color: CHANNEL_META[ch]?.color || '#888',
        groups: byChannel.get(ch)!,
      }));
  }

  /** Flat list of all options for keyboard nav (index 0 = All Groups). */
  private get _flatOptions(): Array<GroupInfo | null> {
    const items: Array<GroupInfo | null> = [null]; // null = All Groups
    for (const section of this._groupedByChannel) {
      items.push(...section.groups);
    }
    return items;
  }

  private get _selectedDisplay(): { name: string; color?: string } {
    if (!this.selected) return { name: 'All Groups' };
    const group = this.groups.find(g => g.folder === this.selected);
    if (!group) return { name: 'Select group' };
    const ch = group.channel || 'unknown';
    return {
      name: group.name,
      color: CHANNEL_META[ch]?.color,
    };
  }

  override render() {
    const display = this._selectedDisplay;

    return html`
      <div class="picker">
        <button
          class="picker-trigger"
          @click=${this._toggleOpen}
          @keydown=${this._handleKeydown}
          aria-haspopup="listbox"
          aria-expanded=${this._open}
        >
          <span class="picker-value">
            ${display.color
              ? html`<span class="channel-dot" style="background:${display.color}"></span>`
              : nothing}
            ${display.name}
          </span>
          <span class="picker-chevron ${this._open ? 'open' : ''}">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="${ICON_PATHS.chevronDown}" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
        ${this._open ? this._renderDropdown() : nothing}
      </div>
    `;
  }

  private _renderDropdown() {
    const flat = this._flatOptions;
    let flatIndex = 0;

    return html`
      <div class="picker-dropdown" role="listbox">
        <!-- All Groups -->
        <button
          class="all-groups-option ${!this.selected ? 'selected' : ''} ${this._focusedIndex === 0 ? 'focused' : ''}"
          role="option"
          aria-selected=${!this.selected}
          @click=${() => this._selectAll()}
          @mouseenter=${() => { this._focusedIndex = 0; }}
        >
          <svg viewBox="0 0 24 24"><path d="${ICON_PATHS.grid}"/></svg>
          All Groups
        </button>
        <div class="divider"></div>

        <!-- Grouped by channel -->
        ${this._groupedByChannel.map(section => {
          return html`
            <div class="section-header">
              <span class="section-dot" style="background:${section.color}"></span>
              ${section.label}
            </div>
            ${section.groups.map(group => {
              flatIndex++;
              const idx = flat.indexOf(group);
              return html`
                <button
                  class="picker-option ${group.folder === this.selected ? 'selected' : ''} ${idx === this._focusedIndex ? 'focused' : ''}"
                  role="option"
                  aria-selected=${group.folder === this.selected}
                  @click=${() => this._selectGroup(group)}
                  @mouseenter=${() => { this._focusedIndex = idx; }}
                >
                  <span class="option-name">${group.name}</span>
                </button>
              `;
            })}
          `;
        })}
      </div>
    `;
  }

  private _toggleOpen(): void {
    this._open = !this._open;
    if (this._open) {
      const flat = this._flatOptions;
      this._focusedIndex = this.selected
        ? flat.findIndex(g => g?.folder === this.selected)
        : 0;
    }
  }

  private _handleKeydown(e: KeyboardEvent): void {
    const flat = this._flatOptions;
    if (!this._open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        this._open = true;
        this._focusedIndex = this.selected
          ? flat.findIndex(g => g?.folder === this.selected)
          : 0;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._focusedIndex = Math.min(this._focusedIndex + 1, flat.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (this._focusedIndex === 0) {
          this._selectAll();
        } else if (this._focusedIndex > 0 && this._focusedIndex < flat.length) {
          this._selectGroup(flat[this._focusedIndex]!);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._open = false;
        break;
    }
  }

  private _selectAll(): void {
    this._open = false;
    store.clearActiveGroup();
    this.dispatchEvent(
      new CustomEvent('group-change', {
        detail: { group: null },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _selectGroup(group: GroupInfo): void {
    this._open = false;
    store.setActiveGroup(group);
    this.dispatchEvent(
      new CustomEvent('group-change', {
        detail: { group },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-picker': GroupPicker;
  }
}
