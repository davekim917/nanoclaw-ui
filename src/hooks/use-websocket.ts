import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 30_000;
const JITTER = 0.3;

function getReconnectDelay(attempt: number): number {
  const exp = Math.min(BASE_DELAY * 2 ** attempt, MAX_DELAY);
  return exp * (1 + JITTER * (Math.random() * 2 - 1));
}

/**
 * Manages a single WebSocket connection to /ws.
 * - Auto-reconnects with exponential backoff
 * - Subscribes to the active group on connect and group change
 * - Routes messages to chat-store and invalidates TanStack Query caches
 */
export function useWebSocket() {
  const queryClient = useQueryClient();
  const activeGroup = useUiStore((s) => s.activeGroup);
  const addStreamingEvent = useChatStore((s) => s.addStreamingEvent);
  const clearStreaming = useChatStore((s) => s.clearStreaming);
  const setStreamingSessionKey = useChatStore((s) => s.setStreamingSessionKey);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeGroupRef = useRef(activeGroup);
  const lastEventTimestampRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Keep ref in sync without recreating the effect
  activeGroupRef.current = activeGroup;

  const subscribe = useCallback((ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      const msg: WsMessage = {
        type: 'subscribe',
        groups: activeGroupRef.current ? [activeGroupRef.current] : [],
      };
      if (lastEventTimestampRef.current !== null) {
        msg['since'] = lastEventTimestampRef.current;
      }
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      attemptRef.current = 0;
      subscribe(ws);
    });

    ws.addEventListener('message', (evt: MessageEvent) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(evt.data as string) as WsMessage;
      } catch {
        return;
      }

      // Track last event time for reconnection replay
      if (typeof msg['timestamp'] === 'number') {
        lastEventTimestampRef.current = msg['timestamp'] as number;
      }

      switch (msg.type) {
        case 'progress':
          addStreamingEvent(msg);
          break;

        case 'session_start': {
          const key = msg['sessionKey'] as string | undefined;
          if (key) setStreamingSessionKey(key);
          // Invalidate active sessions
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
    });

    ws.addEventListener('close', () => {
      if (!mountedRef.current) return;
      const delay = getReconnectDelay(attemptRef.current);
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }, [queryClient, subscribe, addStreamingEvent, clearStreaming, setStreamingSessionKey]);

  // Initial connection
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Re-subscribe on group change
  useEffect(() => {
    if (wsRef.current) {
      subscribe(wsRef.current);
    }
  }, [activeGroup, subscribe]);

  // Expose send for chat input
  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
