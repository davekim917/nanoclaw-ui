/**
 * WebSocket client with exponential backoff reconnection,
 * subscription management, and typed event dispatch.
 */

import type { WsClientMessage, WsServerMessage, Capabilities } from './types.js';
import { ApiClient } from './client.js';

// ── Typed custom events ─────────────────────────────────────────────

export class WsConnectedEvent extends Event {
  readonly capabilities: Capabilities;
  constructor(capabilities: Capabilities) {
    super('ws-connected');
    this.capabilities = capabilities;
  }
}

export class WsProgressEvent extends Event {
  readonly sessionKey: string;
  readonly group: string;
  readonly progressEvent: unknown;
  constructor(sessionKey: string, group: string, event: unknown) {
    super('ws-progress');
    this.sessionKey = sessionKey;
    this.group = group;
    this.progressEvent = event;
  }
}

export class WsSessionStartEvent extends Event {
  readonly sessionKey: string;
  readonly group: string;
  readonly groupJid: string;
  constructor(sessionKey: string, group: string, groupJid: string) {
    super('ws-session-start');
    this.sessionKey = sessionKey;
    this.group = group;
    this.groupJid = groupJid;
  }
}

export class WsSessionEndEvent extends Event {
  readonly sessionKey: string;
  constructor(sessionKey: string) {
    super('ws-session-end');
    this.sessionKey = sessionKey;
  }
}

export class WsMessageStoredEvent extends Event {
  readonly messageId: string;
  constructor(id: string) {
    super('ws-message-stored');
    this.messageId = id;
  }
}

export class WsSkillInstallProgressEvent extends Event {
  readonly jobId: string;
  readonly output: string;
  readonly status: string;
  constructor(jobId: string, output: string, status: string) {
    super('ws-skill-install-progress');
    this.jobId = jobId;
    this.output = output;
    this.status = status;
  }
}

export class WsErrorEvent extends Event {
  readonly code: string;
  readonly errorMessage: string;
  constructor(code: string, message: string) {
    super('ws-error');
    this.code = code;
    this.errorMessage = message;
  }
}

export class WsDisconnectedEvent extends Event {
  constructor() {
    super('ws-disconnected');
  }
}

// ── WebSocket Client ────────────────────────────────────────────────

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const JITTER_MAX_MS = 500;

export class WsClient extends EventTarget {
  private readonly _baseUrl: string;
  private readonly _token: string;
  private _ws: WebSocket | null = null;
  private _connected = false;
  private _intentionalClose = false;
  private _backoff = INITIAL_BACKOFF_MS;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastSubscription: WsClientMessage | null = null;
  private _apiClient: ApiClient | null = null;

  constructor(baseUrl: string, token: string) {
    super();
    this._baseUrl = baseUrl.replace(/\/+$/, '');
    this._token = token;
  }

  get connected(): boolean {
    return this._connected;
  }

  /** Set an optional REST client for resync fallback. */
  set apiClient(client: ApiClient) {
    this._apiClient = client;
  }

  connect(): void {
    this._intentionalClose = false;
    this._doConnect();
  }

  disconnect(): void {
    this._intentionalClose = true;
    this._clearReconnectTimer();
    if (this._ws) {
      this._ws.close(1000, 'Client disconnect');
      this._ws = null;
    }
    this._connected = false;
  }

  sendMessage(groupJid: string, text: string, senderName?: string): void {
    const msg: WsClientMessage = {
      type: 'send_message',
      groupJid,
      text,
      ...(senderName ? { senderName } : {}),
    };
    this._send(msg);
  }

  subscribe(groups?: string[]): void {
    const msg: WsClientMessage = { type: 'subscribe', groups };
    this._lastSubscription = msg;
    this._send(msg);
  }

  // ── Connection lifecycle ──────────────────────────────────────

  private _doConnect(): void {
    const wsUrl = this._baseUrl
      .replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(this._token)}`;

    const ws = new WebSocket(wsUrl);
    this._ws = ws;

    ws.addEventListener('open', () => {
      this._connected = true;
      this._backoff = INITIAL_BACKOFF_MS;

      // Re-subscribe on reconnect
      if (this._lastSubscription) {
        this._send(this._lastSubscription);
      }
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      this._handleMessage(event.data as string);
    });

    ws.addEventListener('close', () => {
      this._connected = false;
      this._ws = null;
      this.dispatchEvent(new WsDisconnectedEvent());

      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    });

    ws.addEventListener('error', () => {
      // The close event will fire after error — reconnect handled there
    });
  }

  private _handleMessage(raw: string): void {
    let msg: WsServerMessage;
    try {
      msg = JSON.parse(raw) as WsServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'connected':
        this.dispatchEvent(new WsConnectedEvent(msg.capabilities));
        break;

      case 'progress':
        this.dispatchEvent(new WsProgressEvent(msg.sessionKey, msg.group, msg.event));
        break;

      case 'session_start':
        this.dispatchEvent(new WsSessionStartEvent(msg.sessionKey, msg.group, msg.groupJid));
        break;

      case 'session_end':
        this.dispatchEvent(new WsSessionEndEvent(msg.sessionKey));
        break;

      case 'message_stored':
        this.dispatchEvent(new WsMessageStoredEvent(msg.id));
        break;

      case 'skill_install_progress':
        this.dispatchEvent(new WsSkillInstallProgressEvent(msg.jobId, msg.output, msg.status));
        break;

      case 'resync':
        this._handleResync();
        break;

      case 'error':
        this.dispatchEvent(new WsErrorEvent(msg.code, msg.message));
        break;
    }
  }

  private async _handleResync(): Promise<void> {
    // On resync, fetch full state via REST if apiClient is available
    if (this._apiClient) {
      try {
        const capabilities = await this._apiClient.getCapabilities();
        this.dispatchEvent(new WsConnectedEvent(capabilities));
      } catch {
        // Resync failed — client will eventually get updates via WS
      }
    }
  }

  // ── Reconnection with exponential backoff + jitter ────────────

  private _scheduleReconnect(): void {
    this._clearReconnectTimer();

    const jitter = Math.random() * JITTER_MAX_MS;
    const delay = Math.min(this._backoff + jitter, MAX_BACKOFF_MS);

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._backoff = Math.min(this._backoff * 2, MAX_BACKOFF_MS);
      this._doConnect();
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  // ── Send helper ───────────────────────────────────────────────

  private _send(msg: WsClientMessage): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  }
}
