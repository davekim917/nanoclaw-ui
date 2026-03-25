import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Radio,
  MessageSquare,
  ChevronRight,
  MessagesSquare,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { channelStyles } from '@/lib/channels';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---- API types ----

interface Session {
  key: string;
  group?: string;
  channel?: string;
  startedAt?: string;
  endedAt?: string;
  messageCount?: number;
  isActive?: boolean;
  duration?: number;
}

interface SessionsResponse {
  sessions: Record<string, { group: string; groupJid: string; threadId?: string; startedAt: string }>;
}

interface RawHistorySession {
  session_key: string;
  group_folder: string;
  chat_jid: string;
  created_at: string;
  last_activity?: string;
  thread_id?: string;
}

interface HistoryResponse {
  data: RawHistorySession[];
  total: number;
  limit: number;
  offset: number;
}

function channelFromJid(jid: string): string {
  if (jid.startsWith('dc:')) return 'discord';
  if (jid.startsWith('slack:')) return 'slack';
  if (jid.startsWith('tg:')) return 'telegram';
  if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) return 'whatsapp';
  return 'web';
}

// ---- Channel badge ----

function ChannelBadge({ channel }: { channel?: string }) {
  const lower = (channel ?? '').toLowerCase();
  const style = channelStyles[lower] ?? {
    label: channel ?? 'unknown',
    className: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

// ---- Duration formatter ----

function formatDuration(ms?: number): string {
  if (!ms) return '';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

// ---- Session row ----

function SessionRow({ session, group }: { session: Session; group: string }) {
  return (
    <Link
      to={`/g/${group}/sessions/${session.key}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors duration-150 min-h-[56px] border-b last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {session.isActive && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
          <p className="text-sm font-medium truncate font-mono">{session.key}</p>
        </div>
        {session.startedAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(session.startedAt).toLocaleString()}
            {session.duration ? ` · ${formatDuration(session.duration)}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        <ChannelBadge channel={session.channel} />
        {typeof session.messageCount === 'number' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {session.messageCount}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

// ---- Loading skeleton ----

function SessionListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 ml-3" />
        </div>
      ))}
    </div>
  );
}

// ---- Main page ----
// TODO: replace offset pagination (page * PAGE_SIZE) with cursor-based pagination like logs.tsx

export default function SessionsPage() {
  const { group } = useParams<{ group: string }>();
  const activeGroup = group ?? '';
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);

  const { data: activeData, isLoading: activeLoading, isError: activeError } = useQuery<SessionsResponse>({
    queryKey: queryKeys.sessions(activeGroup),
    queryFn: () => api<SessionsResponse>('/api/sessions'),
    staleTime: 15_000,
    retry: false,
  });

  const { data: historyData, isLoading: historyLoading, isError: historyError, isFetching } = useQuery<HistoryResponse>({
    queryKey: [...queryKeys.sessionHistory(activeGroup), page],
    queryFn: () =>
      api<HistoryResponse>(
        `/api/sessions/history?group=${activeGroup}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      ),
    staleTime: 30_000,
    retry: false,
  });

  // Convert active sessions from object map to array
  const activeSessions: Session[] = activeData?.sessions
    ? Object.entries(activeData.sessions).map(([key, val]) => ({
        key,
        group: val.group,
        channel: channelFromJid(val.groupJid),
        startedAt: val.startedAt,
        isActive: true,
      }))
    : [];

  // Convert history sessions from snake_case backend response
  const historySessions: Session[] = (historyData?.data ?? []).map((s) => ({
    key: s.session_key,
    group: s.group_folder,
    channel: channelFromJid(s.chat_jid),
    startedAt: s.created_at,
    endedAt: s.last_activity,
  }));
  const hasMore = historySessions.length === PAGE_SIZE;

  // Treat errored queries the same as not-loading (show empty state)
  const showActiveLoading = activeLoading && !activeError;
  const showHistoryLoading = historyLoading && !historyError;

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Sessions</h1>

      {/* Active sessions */}
      {(showActiveLoading || activeSessions.length > 0) && (
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-green-500" />
              Live
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {showActiveLoading ? (
              <SessionListSkeleton />
            ) : activeSessions.length === 0 ? (
              <div className="px-4 py-3">
                <p className="text-sm text-muted-foreground">No active sessions right now.</p>
              </div>
            ) : (
              activeSessions.map((s) => (
                <SessionRow key={s.key} session={s} group={activeGroup} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {showHistoryLoading ? (
            <SessionListSkeleton />
          ) : historySessions.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No sessions yet"
              description="Chat sessions from Discord, Slack, WhatsApp, and the web will appear here."
              action={{ label: 'Start a chat', to: `/g/${activeGroup}/chat` }}
            />
          ) : (
            <>
              {historySessions.map((s) => (
                <SessionRow key={s.key} session={s} group={activeGroup} />
              ))}
              {(hasMore || page > 0) && (
                <div className="flex items-center justify-center gap-2 p-3 border-t">
                  {page > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={isFetching}
                    >
                      Previous
                    </Button>
                  )}
                  {hasMore && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={isFetching}
                    >
                      Load more
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
