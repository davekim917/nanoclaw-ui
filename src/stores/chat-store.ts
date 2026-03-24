import { create } from 'zustand';

interface ChatState {
  streamingSessionKey: string | null;
  streamingEvents: unknown[];
  addStreamingEvent: (event: unknown) => void;
  clearStreaming: () => void;
  setStreamingSessionKey: (key: string | null) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  streamingSessionKey: null,
  streamingEvents: [],

  addStreamingEvent: (event) =>
    set((state) => ({
      streamingEvents: [...state.streamingEvents, event],
    })),

  clearStreaming: () =>
    set({ streamingSessionKey: null, streamingEvents: [] }),

  setStreamingSessionKey: (key) => set({ streamingSessionKey: key }),
}));
