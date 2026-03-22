/**
 * Shared SVG icon path data (24x24 viewbox, stroke-based).
 * Single source of truth — import paths from here instead of duplicating.
 */

export const ICON_PATHS = {
  // Brand — abstract pincer: two arms converging to a grip point
  pincer: 'M5 4c2 3 4.5 6.5 7 8.5M5 4c1 1.5 3 2 5 1.5M19 4c-2 3-4.5 6.5-7 8.5M19 4c-1 1.5-3 2-5 1.5M8 16c1.5 1.2 2.8 2.5 4 4m4-4c-1.5 1.2-2.8 2.5-4 4',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  skills: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15',
  bulb: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4',
  sparkle: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  close: 'M18 6L6 18M6 6l12 12',
  arrowLeft: 'M19 12H5m0 0l7 7m-7-7l7-7',
  chevronDown: 'M6 9l6 6 6-6',
} as const;
