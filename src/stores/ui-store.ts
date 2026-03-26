import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface UiState {
  activeGroup: string;
  activeGroupJid: string;
  setActiveGroup: (group: string, jid?: string) => void;

  theme: Theme;
  toggleTheme: () => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  sessionSidebarOpen: boolean;
  setSessionSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeGroup: '',
      activeGroupJid: '',
      setActiveGroup: (group, jid) => set({ activeGroup: group, activeGroupJid: jid ?? '' }),

      theme: 'light',
      toggleTheme: () =>
        set((state) => {
          const next: Theme = state.theme === 'light' ? 'dark' : 'light';
          // Apply to document
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next === 'dark');
          }
          return { theme: next };
        }),

      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      sessionSidebarOpen: true,
      setSessionSidebarOpen: (open) => set({ sessionSidebarOpen: open }),
    }),
    {
      name: 'nanoclaw-ui',
      partialize: (state) => ({
        activeGroup: state.activeGroup,
        activeGroupJid: state.activeGroupJid,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        sessionSidebarOpen: state.sessionSidebarOpen,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync theme to document class on rehydration
        if (state && typeof document !== 'undefined') {
          document.documentElement.classList.toggle(
            'dark',
            state.theme === 'dark',
          );
        }
      },
    },
  ),
);
