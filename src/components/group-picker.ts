/**
 * <group-picker> — Custom dropdown for selecting the active NanoClaw group.
 *
 * Replaces native <select> with a styled dropdown matching the design system.
 * Supports keyboard navigation (Arrow Up/Down, Enter, Escape).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GroupInfo } from '../api/types.js';
import { store } from '../state/app-store.js';
import { ICON_PATHS } from '../utils/icons.js';

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

    .picker-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
      min-width: 140px;
      transition: border-color var(--transition-fast);
      outline: none;
    }

    .picker-trigger:hover,
    .picker-trigger:focus-visible {
      border-color: var(--color-accent);
    }

    .picker-value {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      min-width: 100%;
      max-height: 240px;
      overflow-y: auto;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 60;
      padding: var(--spacing-xs) 0;
    }

    .picker-option {
      display: block;
      width: 100%;
      padding: 8px var(--spacing-md);
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

    @media (max-width: 768px) {
      .picker-label {
        display: none;
      }

      .picker-trigger {
        min-width: 0;
        max-width: 120px;
        font-size: 0.75rem;
        padding: 4px 6px;
      }
    }
  `;

  @property({ type: Array }) groups: GroupInfo[] = [];
  @property() selected?: string;
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

  private get _selectedName(): string {
    const group = this.groups.find(g => g.folder === this.selected);
    return group?.name || 'Select group';
  }

  override render() {
    return html`
      <div class="picker">
        <span class="picker-label">Group</span>
        <button
          class="picker-trigger"
          @click=${this._toggleOpen}
          @keydown=${this._handleKeydown}
          aria-haspopup="listbox"
          aria-expanded=${this._open}
        >
          <span class="picker-value">${this._selectedName}</span>
          <span class="picker-chevron ${this._open ? 'open' : ''}">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="${ICON_PATHS.chevronDown}" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
        ${this._open ? html`
          <div class="picker-dropdown" role="listbox">
            ${this.groups.map((group, i) => html`
              <button
                class="picker-option ${group.folder === this.selected ? 'selected' : ''} ${i === this._focusedIndex ? 'focused' : ''}"
                role="option"
                aria-selected=${group.folder === this.selected}
                @click=${() => this._selectGroup(group)}
                @mouseenter=${() => { this._focusedIndex = i; }}
              >
                ${group.name}
              </button>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _toggleOpen(): void {
    this._open = !this._open;
    if (this._open) {
      this._focusedIndex = this.groups.findIndex(g => g.folder === this.selected);
    }
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (!this._open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        this._open = true;
        this._focusedIndex = this.groups.findIndex(g => g.folder === this.selected);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._focusedIndex = Math.min(this._focusedIndex + 1, this.groups.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (this._focusedIndex >= 0 && this._focusedIndex < this.groups.length) {
          this._selectGroup(this.groups[this._focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._open = false;
        break;
    }
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
