/**
 * <auth-form> — Login form for connecting to a NanoClaw instance.
 *
 * Collects URL + token, validates via GET /api/capabilities,
 * saves URL to localStorage and token to sessionStorage.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ApiClient } from '../api/client.js';
import { store } from '../state/app-store.js';

@customElement('auth-form')
export class AuthForm extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: 100dvh;
      padding: var(--spacing-lg);
      background: var(--color-bg-primary);
    }

    .card {
      width: 100%;
      max-width: 400px;
      padding: var(--spacing-xl) var(--spacing-lg);
      border-radius: var(--radius-lg);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(45, 212, 191, 0.05);
    }

    .logo {
      text-align: center;
      margin-bottom: var(--spacing-xl);
    }

    .logo-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--color-accent-dim);
      margin-bottom: var(--spacing-md);
      font-size: 1.5rem;
    }

    .logo h1 {
      font-size: 1.375rem;
      font-weight: 700;
      color: var(--color-accent);
      letter-spacing: -0.01em;
    }

    .logo p {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: var(--spacing-xs);
    }

    label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: 6px;
    }

    input {
      display: block;
      width: 100%;
      padding: 10px var(--spacing-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }

    input:focus {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px var(--color-accent-dim);
    }

    input::placeholder {
      color: var(--color-text-muted);
    }

    .field {
      margin-bottom: var(--spacing-md);
    }

    .token-input {
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }

    button {
      display: block;
      width: 100%;
      padding: 10px var(--spacing-md);
      margin-top: var(--spacing-lg);
      border: none;
      border-radius: var(--radius-md);
      background: var(--color-accent);
      color: var(--color-bg-primary);
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }

    button:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }

    button:active:not(:disabled) {
      transform: scale(0.98);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      margin-top: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-error) 12%, transparent);
      color: var(--color-error);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      :host {
        padding: var(--spacing-md);
        align-items: flex-start;
        padding-top: 15vh;
      }

      .card {
        max-width: none;
        padding: var(--spacing-lg);
        border-radius: var(--radius-lg);
      }

      input {
        font-size: 1rem;
        padding: 12px var(--spacing-md);
      }

      button {
        font-size: 1rem;
        padding: 12px var(--spacing-md);
      }
    }
  `;

  @state() private _url = '';
  @state() private _token = '';
  @state() private _loading = false;
  @state() private _error = '';

  override connectedCallback(): void {
    super.connectedCallback();
    // Pre-fill saved URL
    const savedUrl = localStorage.getItem('nanoclaw-url');
    if (savedUrl) {
      this._url = savedUrl;
    }
  }

  override render() {
    return html`
      <div class="card">
        <div class="logo">
          <div class="logo-icon">⚡</div>
          <h1>NanoClaw</h1>
          <p>Connect to your NanoClaw instance</p>
        </div>

        <form @submit=${this._handleSubmit}>
          <div class="field">
            <label for="url">Instance URL</label>
            <input
              id="url"
              type="url"
              placeholder="http://localhost:3002"
              .value=${this._url}
              @input=${(e: InputEvent) => this._url = (e.target as HTMLInputElement).value}
              required
            />
          </div>

          <div class="field">
            <label for="token">API Token</label>
            <input
              id="token"
              type="password"
              class="token-input"
              placeholder="Your API token"
              .value=${this._token}
              @input=${(e: InputEvent) => this._token = (e.target as HTMLInputElement).value}
              required
            />
          </div>

          <button type="submit" ?disabled=${this._loading}>
            ${this._loading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
      </div>
    `;
  }

  private async _handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this._error = '';
    this._loading = true;

    // Validate URL format
    let normalizedUrl: string;
    try {
      const parsed = new URL(this._url);
      normalizedUrl = parsed.origin;
    } catch {
      this._error = 'Please enter a valid URL';
      this._loading = false;
      return;
    }

    // Validate credentials via capabilities endpoint
    try {
      const client = new ApiClient(normalizedUrl, this._token);
      const capabilities = await client.getCapabilities();

      // Save and update store
      store.setAuth(normalizedUrl, this._token);
      store.setCapabilities(capabilities);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const apiErr = err as { status: number };
        if (apiErr.status === 401) {
          this._error = 'Invalid token — check your API token and try again';
        } else {
          this._error = `Connection failed (HTTP ${apiErr.status})`;
        }
      } else {
        this._error = 'Could not connect — check the URL and try again';
      }
    } finally {
      this._loading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'auth-form': AuthForm;
  }
}
