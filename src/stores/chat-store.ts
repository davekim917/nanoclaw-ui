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
  lastSessionKey: string | null; // persists after streaming ends
  streamingEvents: StreamingEvent[];
  pendingSentText: string | null;
  addStreamingEvent: (event: StreamingEvent) => void;
  clearStreaming: () => void;
  setStreamingSessionKey: (key: string | null) => void;
  setPendingSentText: (text: string | null) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  streamingSessionKey: null,
  lastSessionKey: null,
  streamingEvents: [],
  pendingSentText: null,

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

  setStreamingSessionKey: (key) => set({ streamingSessionKey: key, lastSessionKey: key }),

  setPendingSentText: (text) => set({ pendingSentText: text }),
}));
