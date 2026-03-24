export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  sessions: (group: string) => ['sessions', group] as const,
  sessionHistory: (group: string) => ['session-history', group] as const,
  sessionMessages: (key: string) => ['session-messages', key] as const,
  tasks: (group: string) => ['tasks', group] as const,
  memories: (group: string) => ['memories', group] as const,
  gates: () => ['gates'] as const,
  gateHistory: () => ['gate-history'] as const,
  skills: () => ['skills'] as const,
  logs: (group?: string) => ['logs', group] as const,
  dashboard: (group: string) => ['dashboard', group] as const,
  capabilities: () => ['capabilities'] as const,
  users: () => ['users'] as const,
  mcpServers: (group: string) => ['mcp-servers', group] as const,
};
