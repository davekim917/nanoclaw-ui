import { create } from 'zustand';

export interface StreamingEvent {
  type: string;
  sessionKey?: string;
  group?: string;
  // Nested progress event from backend
  event?: {
    eventType: string;
    data: Record<string, string | undefined>;
    seq: number;
    ts: number;
  };
}

interface ChatState {
  streamingSessionKey: string | null;
  lastSessionKey: string | null;
  streamingEvents: StreamingEvent[];
  pendingSentText: string | null;
  /** ISO timestamp when the current web conversation started — used to filter out older messages */
  conversationStartedAt: string | null;
  addStreamingEvent: (event: StreamingEvent) => void;
  clearStreaming: () => void;
  setStreamingSessionKey: (key: string | null) => void;
  setPendingSentText: (text: string | null) => void;
  clearCurrentThread: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  streamingSessionKey: null,
  lastSessionKey: null,
  streamingEvents: [],
  pendingSentText: null,
  conversationStartedAt: null,

  addStreamingEvent: (event) =>
    set((state) => {
      const events = [...state.streamingEvents, event];
      return { streamingEvents: events.length > 500 ? events.slice(-500) : events };
    }),

  clearStreaming: () =>
    set((state) => ({
      streamingSessionKey: null,
      streamingEvents: [],
      pendingSentText: null,
      lastSessionKey: state.streamingSessionKey ?? state.lastSessionKey,
    })),

  setStreamingSessionKey: (key) =>
    set((state) => ({
      streamingSessionKey: key,
      lastSessionKey: state.pendingSentText ? key : state.lastSessionKey,
    })),

  setPendingSentText: (text) =>
    set({
      pendingSentText: text,
      // Mark when this web conversation started
      ...(text ? { conversationStartedAt: new Date().toISOString() } : {}),
    }),

  clearCurrentThread: () =>
    set({
      streamingSessionKey: null,
      lastSessionKey: null,
      streamingEvents: [],
      pendingSentText: null,
      conversationStartedAt: null,
    }),
}));
