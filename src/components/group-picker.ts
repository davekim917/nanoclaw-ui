/**
 * <group-picker> — Dropdown for selecting the active NanoClaw group.
 *
 * Populated from capabilities.groups. Dispatches 'group-change' custom event
 * and updates the global AppStore.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GroupInfo } from '../api/types.js';
import { store } from '../state/app-store.js';

@customElement('group-picker')
export class GroupPicker extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }

    .picker {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    select {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      cursor: pointer;
      outline: none;
      min-width: 160px;
    }

    select:focus {
      border-color: var(--color-accent);
    }

    option {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
    }
  `;

  @property({ type: Array }) groups: GroupInfo[] = [];
  @property() selected?: string;
  @state() private _open = false;

  override render() {
    return html`
      <div class="picker">
        <label for="group-select">Group</label>
        <select
          id="group-select"
          .value=${this.selected ?? ''}
          @change=${this._handleChange}
        >
          ${this.groups.map(
            group => html`
              <option
                value=${group.folder}
                ?selected=${group.folder === this.selected}
              >
                ${group.name}
              </option>
            `,
          )}
        </select>
      </div>
    `;
  }

  private _handleChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const folder = select.value;
    const group = this.groups.find(g => g.folder === folder);
    if (group) {
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
}

declare global {
  interface HTMLElementTagNameMap {
    'group-picker': GroupPicker;
  }
}
