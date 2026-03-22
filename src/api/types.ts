/**
 * API response types — client-side mirror of server types.
 * No runtime dependencies; purely type definitions.
 */

// ── Paginated response envelope ─────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Capabilities ────────────────────────────────────────────────────

export interface Capabilities {
  version: string;
  features: {
    memory: boolean;
    backlog: boolean;
    ship_log: boolean;
    thread_search: boolean;
    tone_profiles: boolean;
    gate_protocol: boolean;
    activity_summary: boolean;
    commit_digest: boolean;
    ollama: boolean;
  };
  channels: string[];
  groups: GroupInfo[];
}

export interface GroupInfo {
  jid: string;
  name: string;
  folder: string;
  channel: string;
}

// ── Sessions ────────────────────────────────────────────────────────

export interface SessionV2Full {
  session_key: string;
  group_folder: string;
  thread_id: string;
  session_id: string;
  last_activity: string;
  created_at: string;
  model: string | null;
  effort: string | null;
  processing: number;
  chat_jid: string | null;
}

// ── Tasks ───────────────────────────────────────────────────────────

export interface ScheduledTask {
  id: string;
  group_folder: string;
  name: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  timezone: string;
  status: string;
  next_run: string | null;
  last_run: string | null;
  created_at: string;
  context_mode: string;
  thread_id: string | null;
}

export interface TaskRunLogRow {
  id: number;
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result: string | null;
  error: string | null;
}

// ── Memory ──────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  group_folder: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

// ── Backlog ─────────────────────────────────────────────────────────

export interface BacklogItem {
  id: string;
  group_folder: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

// ── Ship Log ────────────────────────────────────────────────────────

export interface ShipLogEntry {
  id: string;
  group_folder: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
}

// ── Thread Search ───────────────────────────────────────────────────

export interface ThreadSearchResult {
  thread_id: string;
  summary: string;
  rank: number;
}

// ── Messages ────────────────────────────────────────────────────────

export interface Message {
  id: string;
  chat_jid: string;
  sender_jid: string;
  sender_name: string;
  text: string;
  timestamp: string;
  is_from_me: number;
  thread_id: string | null;
}

// ── Skills ──────────────────────────────────────────────────────────

export interface InstalledSkill {
  name: string;
  description: string;
  path: string;
  group?: string;
}

export interface MarketplaceSkill {
  name: string;
  description: string;
  repo: string;
  installs: number;
}

// ── WebSocket protocol ──────────────────────────────────────────────

export type WsClientMessage =
  | { type: 'send_message'; groupJid: string; text: string; senderName?: string; senderId?: string; threadId?: string }
  | { type: 'subscribe'; groups?: string[] };

export type WsServerMessage =
  | { type: 'connected'; capabilities: Capabilities }
  | { type: 'progress'; sessionKey: string; group: string; event: unknown }
  | { type: 'session_start'; sessionKey: string; group: string; groupJid: string }
  | { type: 'session_end'; sessionKey: string }
  | { type: 'message_stored'; id: string }
  | { type: 'skill_install_progress'; jobId: string; output: string; status: string }
  | { type: 'resync' }
  | { type: 'error'; code: string; message: string };
