import { create } from 'zustand';

export interface StreamingEvent {
  type: string;
  event?: string;
  data?: unknown;
  text?: string;
  tool?: string;
  toolName?: string;
  input?: unknown;
  id?: string;
}

interface ChatState {
  streamingSessionKey: string | null;
  streamingEvents: StreamingEvent[];
  addStreamingEvent: (event: StreamingEvent) => void;
  clearStreaming: () => void;
  setStreamingSessionKey: (key: string | null) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  streamingSessionKey: null,
  streamingEvents: [],

  addStreamingEvent: (event) =>
    set((state) => {
      const events = [...state.streamingEvents, event];
      return { streamingEvents: events.length > 500 ? events.slice(-500) : events };
    }),

  clearStreaming: () =>
    set({ streamingSessionKey: null, streamingEvents: [] }),

  setStreamingSessionKey: (key) => set({ streamingSessionKey: key }),
}));
