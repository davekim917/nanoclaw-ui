/**
 * REST API client — thin fetch wrapper with auth, error handling, and typed responses.
 */

import type {
  Capabilities,
  GroupInfo,
  PaginatedResponse,
  SessionV2Full,
  ScheduledTask,
  TaskRunLogRow,
  Memory,
  BacklogItem,
  ShipLogEntry,
  ThreadSearchResult,
  Message,
  InstalledSkill,
  MarketplaceSkill,
} from './types.js';

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, body?: string) {
    super(`HTTP ${status}: ${statusText}${body ? ` — ${body}` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  // ── Generic HTTP methods ────────────────────────────────────────

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this._buildUrl(path, params);
    return this._fetch<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = this._buildUrl(path);
    return this._fetch<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const url = this._buildUrl(path);
    return this._fetch<T>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // ── Convenience methods ─────────────────────────────────────────

  getCapabilities(): Promise<Capabilities> {
    return this.get<Capabilities>('/api/capabilities');
  }

  getGroups(): Promise<{ groups: GroupInfo[] }> {
    return this.get<{ groups: GroupInfo[] }>('/api/groups');
  }

  getSessionHistory(
    group?: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<SessionV2Full>> {
    const params: Record<string, string> = {};
    if (group) params.group = group;
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<SessionV2Full>>('/api/sessions/history', params);
  }

  getSessionMessages(
    key: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Message>> {
    const params: Record<string, string> = {};
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<Message>>(`/api/sessions/${encodeURIComponent(key)}/messages`, params);
  }

  getTasks(
    group?: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<ScheduledTask>> {
    const params: Record<string, string> = {};
    if (group !== undefined) params.group = group;
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<ScheduledTask>>('/api/tasks', params);
  }

  getTaskById(id: string): Promise<ScheduledTask> {
    return this.get<ScheduledTask>(`/api/tasks/${encodeURIComponent(id)}`);
  }

  getTaskLogs(
    id: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<TaskRunLogRow>> {
    const params: Record<string, string> = {};
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<TaskRunLogRow>>(`/api/tasks/${encodeURIComponent(id)}/logs`, params);
  }

  getMemories(
    group: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Memory>> {
    const params: Record<string, string> = { group };
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<Memory>>('/api/memories', params);
  }

  searchMemories(
    group: string,
    query: string,
  ): Promise<PaginatedResponse<Memory>> {
    return this.get<PaginatedResponse<Memory>>('/api/memories/search', { group, q: query });
  }

  getBacklog(
    group: string,
    status?: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<BacklogItem>> {
    const params: Record<string, string> = { group };
    if (status !== undefined) params.status = status;
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<BacklogItem>>('/api/backlog', params);
  }

  getShipLog(
    group: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<ShipLogEntry>> {
    const params: Record<string, string> = { group };
    if (limit !== undefined) params.limit = String(limit);
    if (offset !== undefined) params.offset = String(offset);
    return this.get<PaginatedResponse<ShipLogEntry>>('/api/ship-log', params);
  }

  searchThreads(
    group: string,
    query: string,
  ): Promise<{ data: ThreadSearchResult[] }> {
    return this.get<{ data: ThreadSearchResult[] }>('/api/threads/search', { group, q: query });
  }

  getInstalledSkills(): Promise<{ data: InstalledSkill[] }> {
    return this.get<{ data: InstalledSkill[] }>('/api/skills/installed');
  }

  searchMarketplace(query: string): Promise<{ data: MarketplaceSkill[] }> {
    return this.get<{ data: MarketplaceSkill[] }>('/api/skills/marketplace', { q: query });
  }

  installSkill(repo: string): Promise<{ status: string; jobId: string }> {
    return this.post<{ status: string; jobId: string }>('/api/skills/install', { repo });
  }

  pauseTask(id: string): Promise<ScheduledTask> {
    return this.post<ScheduledTask>(`/api/tasks/${encodeURIComponent(id)}/pause`, {});
  }

  resumeTask(id: string): Promise<ScheduledTask> {
    return this.post<ScheduledTask>(`/api/tasks/${encodeURIComponent(id)}/resume`, {});
  }

  updateTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
    return this.patch<ScheduledTask>(`/api/tasks/${encodeURIComponent(id)}`, updates);
  }

  deleteTask(id: string): Promise<void> {
    return this._fetchVoid(this._buildUrl(`/api/tasks/${encodeURIComponent(id)}`), { method: 'DELETE' });
  }

  // ── Internal helpers ────────────────────────────────────────────

  private _buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private async _fetch<T>(url: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.token}`);

    const response = await fetch(url, { ...init, headers });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiError(response.status, response.statusText, body);
    }

    return response.json() as Promise<T>;
  }

  private async _fetchVoid(url: string, init: RequestInit): Promise<void> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.token}`);

    const response = await fetch(url, { ...init, headers });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiError(response.status, response.statusText, body);
    }
  }
}
