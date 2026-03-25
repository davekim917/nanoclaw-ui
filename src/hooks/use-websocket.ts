import { useEffect, useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

// --- Module-level singleton WebSocket ---
// Lives outside React lifecycle so strict-mode double-mount can't kill it.

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
let subscribedGroup = '';
let messageHandler: ((msg: WsMessage) => void) | null = null;

const BASE_DELAY = 1000;
const MAX_DELAY = 30_000;

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function ensureConnected(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  ws = new WebSocket(getWsUrl());

  ws.addEventListener('open', () => {
    attempt = 0;
    // Re-subscribe to whatever group we had
    if (subscribedGroup && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', groups: [subscribedGroup] }));
    }
  });

  ws.addEventListener('message', (evt: MessageEvent) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(evt.data as string) as WsMessage;
    } catch {
      return;
    }
    messageHandler?.(msg);
  });

  ws.addEventListener('close', () => {
    const delay = Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY);
    attempt += 1;
    reconnectTimer = setTimeout(ensureConnected, delay);
  });

  ws.addEventListener('error', () => {
    // Will trigger close event which handles reconnect
  });
}

function subscribeToGroup(group: string): void {
  subscribedGroup = group;
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe', groups: group ? [group] : [] }));
  }
}

function wsSend(data: unknown): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// --- React hook ---

export function useWebSocket() {
  const queryClient = useQueryClient();
  const activeGroup = useUiStore((s) => s.activeGroup);
  const addStreamingEvent = useChatStore((s) => s.addStreamingEvent);
  const clearStreaming = useChatStore((s) => s.clearStreaming);
  const setStreamingSessionKey = useChatStore((s) => s.setStreamingSessionKey);

  // Wire up the message handler to route events to stores
  useEffect(() => {
    messageHandler = createMessageHandler(queryClient, addStreamingEvent, clearStreaming, setStreamingSessionKey);
    return () => { messageHandler = null; };
  }, [queryClient, addStreamingEvent, clearStreaming, setStreamingSessionKey]);

  // Ensure WS is connected on mount
  useEffect(() => {
    ensureConnected();
  }, []);

  // Re-subscribe when group changes
  useEffect(() => {
    subscribeToGroup(activeGroup);
  }, [activeGroup]);

  const send = useCallback((data: unknown) => {
    wsSend(data);
  }, []);

  return { send };
}

function createMessageHandler(
  queryClient: QueryClient,
  addStreamingEvent: (event: WsMessage) => void,
  clearStreaming: () => void,
  setStreamingSessionKey: (key: string | null) => void,
) {
  return (msg: WsMessage) => {
    switch (msg.type) {
      case 'progress':
        addStreamingEvent(msg);
        break;

      case 'session_start': {
        const key = msg['sessionKey'] as string | undefined;
        if (key) setStreamingSessionKey(key);
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
        break;
      }

      case 'session_end':
        clearStreaming();
        void queryClient.invalidateQueries({ queryKey: ['sessions'] });
        void queryClient.invalidateQueries({ queryKey: ['session-history'] });
        break;

      case 'resync':
        void queryClient.invalidateQueries();
        break;

      default:
        break;
    }
  };
}
