/**
 * Chat-specific state store.
 *
 * Manages messages, streaming text, and active session for the chat page.
 */

import type { Message } from '../api/types.js';

// ── Events ──────────────────────────────────────────────────────────

export class MessagesChangeEvent extends Event {
  constructor() {
    super('messages-change');
  }
}

export class StreamingChangeEvent extends Event {
  constructor() {
    super('streaming-change');
  }
}

// ── Store ───────────────────────────────────────────────────────────

export class ChatStore extends EventTarget {
  private _messages: Message[] = [];
  private _streamingText = '';
  private _activeSessionKey: string | null = null;
  private _isStreaming = false;

  // ── Messages ──────────────────────────────────────────────────

  get messages(): readonly Message[] {
    return [...this._messages];
  }

  addMessage(message: Message): void {
    this._messages = [...this._messages, message];
    this.dispatchEvent(new MessagesChangeEvent());
  }

  loadHistory(messages: Message[]): void {
    this._messages = [...messages];
    this.dispatchEvent(new MessagesChangeEvent());
  }

  clearMessages(): void {
    this._messages = [];
    this._streamingText = '';
    this._isStreaming = false;
    this._activeSessionKey = null;
    this.dispatchEvent(new MessagesChangeEvent());
    this.dispatchEvent(new StreamingChangeEvent());
  }

  // ── Streaming text ────────────────────────────────────────────

  get streamingText(): string {
    return this._streamingText;
  }

  get isStreaming(): boolean {
    return this._isStreaming;
  }

  appendStreamingText(chunk: string): void {
    this._streamingText += chunk;
    this._isStreaming = true;
    this.dispatchEvent(new StreamingChangeEvent());
  }

  finalizeStreaming(): void {
    this._streamingText = '';
    this._isStreaming = false;
    this.dispatchEvent(new StreamingChangeEvent());
  }

  // ── Active session ────────────────────────────────────────────

  get activeSessionKey(): string | null {
    return this._activeSessionKey;
  }

  setActiveSession(key: string): void {
    this._activeSessionKey = key;
  }
}

/** Singleton chat store instance. */
export const chatStore = new ChatStore();
