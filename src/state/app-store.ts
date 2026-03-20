/**
 * Global application state store — EventTarget-based (design decision D13).
 *
 * Components subscribe via addEventListener and unsubscribe in disconnectedCallback.
 * Getters return immutable snapshots; setters dispatch typed events.
 */

import type { Capabilities, GroupInfo } from '../api/types.js';

// ── Event types ─────────────────────────────────────────────────────

export class AuthChangeEvent extends Event {
  constructor() {
    super('auth-change');
  }
}

export class CapabilitiesChangeEvent extends Event {
  constructor() {
    super('capabilities-change');
  }
}

export class GroupChangeEvent extends Event {
  constructor() {
    super('group-change');
  }
}

// ── Storage keys ────────────────────────────────────────────────────

const URL_STORAGE_KEY = 'nanoclaw-url';
const TOKEN_STORAGE_KEY = 'nanoclaw-token';

// ── Store ───────────────────────────────────────────────────────────

export interface AuthState {
  url: string;
  token: string;
  connected: boolean;
}

export class AppStore extends EventTarget {
  private _authState: AuthState | null = null;
  private _capabilities: Capabilities | null = null;
  private _activeGroup: GroupInfo | null = null;

  constructor() {
    super();
    // Restore saved credentials
    const url = localStorage.getItem(URL_STORAGE_KEY);
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (url && token) {
      this._authState = { url, token, connected: false };
    }
  }

  // ── Auth ────────────────────────────────────────────────────────

  get authState(): AuthState | null {
    return this._authState ? { ...this._authState } : null;
  }

  setAuth(url: string, token: string): void {
    localStorage.setItem(URL_STORAGE_KEY, url);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    this._authState = { url, token, connected: true };
    this.dispatchEvent(new AuthChangeEvent());
  }

  clearAuth(): void {
    localStorage.removeItem(URL_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    this._authState = null;
    this._capabilities = null;
    this._activeGroup = null;
    this.dispatchEvent(new AuthChangeEvent());
  }

  setConnected(connected: boolean): void {
    if (this._authState) {
      this._authState = { ...this._authState, connected };
      this.dispatchEvent(new AuthChangeEvent());
    }
  }

  // ── Capabilities ────────────────────────────────────────────────

  get capabilities(): Capabilities | null {
    return this._capabilities ? { ...this._capabilities } : null;
  }

  setCapabilities(caps: Capabilities): void {
    this._capabilities = caps;
    this.dispatchEvent(new CapabilitiesChangeEvent());

    // Auto-select first group if none active
    if (!this._activeGroup && caps.groups.length > 0) {
      this.setActiveGroup(caps.groups[0]);
    }
  }

  // ── Active group ────────────────────────────────────────────────

  get activeGroup(): GroupInfo | null {
    return this._activeGroup ? { ...this._activeGroup } : null;
  }

  setActiveGroup(group: GroupInfo): void {
    this._activeGroup = { ...group };
    this.dispatchEvent(new GroupChangeEvent());
  }
}

/** Singleton store instance. */
export const store = new AppStore();
