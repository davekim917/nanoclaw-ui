/**
 * <chat-page> — Main chat interface.
 *
 * Integrates REST (message history) and WebSocket (live streaming).
 * Shows group picker, message list, streaming indicator, and input.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { store, GroupChangeEvent } from '../state/app-store.js';
import { chatStore, MessagesChangeEvent, StreamingChangeEvent } from '../state/chat-store.js';
import { ApiClient } from '../api/client.js';
import { WsClient, WsProgressEvent, WsSessionStartEvent, WsSessionEndEvent, WsMessageStoredEvent } from '../api/ws.js';
import type { Message, GroupInfo } from '../api/types.js';
import { router, RouteChangeEvent } from '../router.js';

// Import sub-components (side-effects: register custom elements)
import '../components/chat-message.js';
import '../components/chat-input.js';
import '../components/streaming-text.js';

@customElement('chat-page')
export class ChatPage extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      /* Override page-container padding for chat — chat needs edge-to-edge */
      padding: 0 !important;
    }

    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md) var(--spacing-lg);
      /* No scroll-behavior: smooth — programmatic scrolls during streaming would lag */
      -webkit-overflow-scrolling: touch;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-muted);
      gap: var(--spacing-md);
      text-align: center;
      padding: var(--spacing-xl);
    }

    .empty-icon {
      font-size: 2.5rem;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .empty-hint {
      font-size: 0.875rem;
      max-width: 320px;
      line-height: 1.5;
    }

    .no-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-muted);
      font-size: 0.875rem;
      gap: var(--spacing-sm);
    }

    chat-input {
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .messages-area {
        padding: var(--spacing-sm) var(--spacing-md);
      }
    }
  `;

  @state() private _messages: readonly Message[] = [];
  @state() private _streamingText = '';
  @state() private _isStreaming = false;
  @state() private _activeGroup: GroupInfo | null = null;
  @state() private _sendDisabled = false;
  @state() private _loading = false;
  @query('.messages-area') private _messagesArea!: HTMLElement;

  private _userScrolledUp = false;
  private _apiClient: ApiClient | null = null;
  private _wsClient: WsClient | null = null;

  // Event handler refs for cleanup
  private _groupHandler = () => this._onGroupChange();
  private _messagesHandler = () => this._onMessagesChange();
  private _streamingHandler = () => this._onStreamingChange();
  private _routeHandler = (e: Event) => {
    const evt = e as RouteChangeEvent;
    if (evt.route.page === 'chat' && evt.route.params.groupId) {
      this._navigateToGroup(evt.route.params.groupId);
    }
  };

  // WS event handlers
  private _wsProgressHandler = (e: Event) => this._onWsProgress(e as WsProgressEvent);
  private _wsSessionStartHandler = (e: Event) => this._onWsSessionStart(e as WsSessionStartEvent);
  private _wsSessionEndHandler = (e: Event) => this._onWsSessionEnd(e as WsSessionEndEvent);
  private _wsMessageStoredHandler = (e: Event) => this._onWsMessageStored(e as WsMessageStoredEvent);

  override connectedCallback(): void {
    super.connectedCallback();

    store.addEventListener('group-change', this._groupHandler);
    chatStore.addEventListener('messages-change', this._messagesHandler);
    chatStore.addEventListener('streaming-change', this._streamingHandler);
    router.addEventListener('route-change', this._routeHandler);

    this._activeGroup = store.activeGroup;
    this._messages = chatStore.messages;
    this._streamingText = chatStore.streamingText;
    this._isStreaming = chatStore.isStreaming;

    // Set up API + WS clients
    this._setupClients();

    // Load initial state
    if (this._activeGroup) {
      this._loadHistory();
      this._subscribeWs();
    }

    // Check route params for group navigation
    const route = router.current;
    if (route.page === 'chat' && route.params.groupId) {
      this._navigateToGroup(route.params.groupId);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    store.removeEventListener('group-change', this._groupHandler);
    chatStore.removeEventListener('messages-change', this._messagesHandler);
    chatStore.removeEventListener('streaming-change', this._streamingHandler);
    router.removeEventListener('route-change', this._routeHandler);
    this._detachWsListeners();
  }

  override render() {
    if (!this._activeGroup) {
      return html`<div class="no-group">Select a group to start chatting</div>`;
    }

    return html`
      <div
        class="messages-area"
        @scroll=${this._onScroll}
      >
        ${this._loading
          ? html`<div class="empty-state"><span class="empty-hint">Loading messages...</span></div>`
          : this._messages.length === 0 && !this._isStreaming
            ? html`
                <div class="empty-state">
                  <span class="empty-icon">💬</span>
                  <span class="empty-title">Start a conversation</span>
                  <span class="empty-hint">
                    Send a message to ${this._activeGroup.name} to begin.
                  </span>
                </div>
              `
            : html`
                ${this._messages.map(
                  msg => html`
                    <chat-message
                      .content=${msg.text}
                      .sender=${msg.sender_name}
                      .isUser=${msg.is_from_me === 1}
                      .timestamp=${msg.timestamp}
                    ></chat-message>
                  `,
                )}
              `}
        ${this._isStreaming || this._streamingText
          ? html`
              <streaming-text
                .text=${this._streamingText}
                .streaming=${this._isStreaming}
              ></streaming-text>
            `
          : nothing}
      </div>

      <chat-input
        ?disabled=${this._sendDisabled || !this._activeGroup}
        @send-message=${this._handleSend}
      ></chat-input>
    `;
  }

  override updated(): void {
    this._scrollToBottomIfNeeded();
  }

  // ── Group management ────────────────────────────────────────────

  private _onGroupChange(): void {
    const newGroup = store.activeGroup;
    if (newGroup?.folder !== this._activeGroup?.folder) {
      this._activeGroup = newGroup;
      chatStore.clearMessages();
      if (newGroup) {
        this._loadHistory();
        this._subscribeWs();
      }
    }
  }

  private _navigateToGroup(groupFolder: string): void {
    const caps = store.capabilities;
    if (caps) {
      const group = caps.groups.find(g => g.folder === groupFolder);
      if (group && group.folder !== this._activeGroup?.folder) {
        store.setActiveGroup(group);
      }
    }
  }

  // ── Message handling ────────────────────────────────────────────

  private _onMessagesChange(): void {
    this._messages = chatStore.messages;
  }

  private _onStreamingChange(): void {
    this._streamingText = chatStore.streamingText;
    this._isStreaming = chatStore.isStreaming;
  }

  private _handleSend(e: CustomEvent<{ text: string }>): void {
    if (!this._activeGroup || !this._wsClient) return;

    const text = e.detail.text;

    // Optimistic render
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_jid: this._activeGroup.jid,
      sender_jid: 'web-user',
      sender_name: 'You',
      text,
      timestamp: new Date().toISOString(),
      is_from_me: 1,
      thread_id: null,
    };
    chatStore.addMessage(userMsg);

    // Send via WS
    this._wsClient.sendMessage(this._activeGroup.jid, text, 'Web User');
    this._sendDisabled = true;
    this._userScrolledUp = false;
  }

  // ── WS event handlers ──────────────────────────────────────────

  private _onWsProgress(e: WsProgressEvent): void {
    if (this._activeGroup && e.group === this._activeGroup.folder) {
      const evt = e.progressEvent as Record<string, unknown>;
      if (evt && typeof evt === 'object' && 'text' in evt && typeof evt.text === 'string') {
        chatStore.appendStreamingText(evt.text);
      }
    }
  }

  private _onWsSessionStart(_e: WsSessionStartEvent): void {
    // Session started — streaming may begin
  }

  private _onWsSessionEnd(e: WsSessionEndEvent): void {
    if (chatStore.activeSessionKey === e.sessionKey || chatStore.isStreaming) {
      // Finalize streaming and load the actual response from history
      const streamedText = chatStore.streamingText;
      chatStore.finalizeStreaming();

      if (streamedText) {
        // Add the streamed text as a complete assistant message
        const assistantMsg: Message = {
          id: `resp-${Date.now()}`,
          chat_jid: this._activeGroup?.jid || '',
          sender_jid: 'assistant',
          sender_name: 'Assistant',
          text: streamedText,
          timestamp: new Date().toISOString(),
          is_from_me: 0,
          thread_id: null,
        };
        chatStore.addMessage(assistantMsg);
      }

      this._sendDisabled = false;
    }
  }

  private _onWsMessageStored(_e: WsMessageStoredEvent): void {
    // Ack received — could re-enable send or update message ID
    // Send already re-enables on session_end
  }

  // ── Data loading ────────────────────────────────────────────────

  private async _loadHistory(): Promise<void> {
    if (!this._apiClient || !this._activeGroup) return;

    this._loading = true;
    try {
      const result = await this._apiClient.getSessionHistory(
        this._activeGroup.folder,
        1,
        0,
      );
      if (result.data.length > 0) {
        const latestSession = result.data[0];
        chatStore.setActiveSession(latestSession.session_key);

        // Load messages for the latest session
        const messages = await this._apiClient.getSessionMessages(
          latestSession.session_key,
          50,
          0,
        );
        chatStore.loadHistory(messages.data);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      this._loading = false;
    }
  }

  // ── Client setup ────────────────────────────────────────────────

  private _setupClients(): void {
    const auth = store.authState;
    if (!auth) return;

    this._apiClient = new ApiClient(auth.url, auth.token);
    this._wsClient = new WsClient(auth.url, auth.token);
    this._wsClient.apiClient = this._apiClient;
    this._wsClient.connect();
    this._attachWsListeners();
  }

  private _subscribeWs(): void {
    if (this._wsClient && this._activeGroup) {
      this._wsClient.subscribe([this._activeGroup.folder]);
    }
  }

  private _attachWsListeners(): void {
    if (!this._wsClient) return;
    this._wsClient.addEventListener('ws-progress', this._wsProgressHandler);
    this._wsClient.addEventListener('ws-session-start', this._wsSessionStartHandler);
    this._wsClient.addEventListener('ws-session-end', this._wsSessionEndHandler);
    this._wsClient.addEventListener('ws-message-stored', this._wsMessageStoredHandler);
  }

  private _detachWsListeners(): void {
    if (!this._wsClient) return;
    this._wsClient.removeEventListener('ws-progress', this._wsProgressHandler);
    this._wsClient.removeEventListener('ws-session-start', this._wsSessionStartHandler);
    this._wsClient.removeEventListener('ws-session-end', this._wsSessionEndHandler);
    this._wsClient.removeEventListener('ws-message-stored', this._wsMessageStoredHandler);
    this._wsClient.disconnect();
    this._wsClient = null;
  }

  // ── Scroll management ──────────────────────────────────────────

  private _onScroll(): void {
    if (!this._messagesArea) return;
    const { scrollTop, scrollHeight, clientHeight } = this._messagesArea;
    this._userScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
  }

  private _scrollToBottomIfNeeded(): void {
    if (!this._userScrolledUp && this._messagesArea) {
      this._messagesArea.scrollTop = this._messagesArea.scrollHeight;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-page': ChatPage;
  }
}
