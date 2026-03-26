import { useRef, useCallback, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { relativeTime } from '@/lib/format';
import { channelFromJid } from '@/lib/channels';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Filter, FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';

// ---- Types ----

interface SessionEntry {
  key: string;
  group: string;
  channel: string;
  messageCount: number;
  startedAt: string;
  endedAt?: string;
}

interface SessionPage {
  items: SessionEntry[];
  nextCursor?: string;
}

interface RawSession {
  session_key: string;
  group_folder: string;
  chat_jid: string;
  created_at: string;
  last_activity?: string;
  thread_id?: string;
}

interface RawHistoryResponse {
  data: RawSession[];
  total: number;
  limit: number;
  offset: number;
}


function channelColor(channel: string): string {
  const map: Record<string, string> = {
    discord: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    whatsapp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    slack: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    telegram: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    web: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };
  return map[channel.toLowerCase()] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

// ---- Row skeleton ----

function LogRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b">
      <Skeleton className="h-4 w-20 shrink-0" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-8 ml-auto" />
    </div>
  );
}

// ---- Page ----

export default function LogsPage() {
  const { group } = useParams<{ group: string }>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  const PAGE_SIZE = 50;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<SessionPage>({
    queryKey: ['logs', group, from, to],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (group) params.set('group', group);
      params.set('limit', String(PAGE_SIZE));
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      params.set('offset', String(offset));
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const raw = await api<RawHistoryResponse>(`/api/sessions/history?${params.toString()}`);
      return {
        items: (raw.data ?? []).map((s) => ({
          key: s.session_key,
          group: s.group_folder,
          channel: channelFromJid(s.chat_jid),
          messageCount: 0,
          startedAt: s.created_at,
          endedAt: s.last_activity,
        })),
        nextCursor: offset + raw.limit < raw.total ? String(offset + raw.limit) : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor !== undefined ? Number(lastPage.nextCursor) : undefined,
  });

  // Keep isFetchingRef current without recreating the observer
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  // Intersection observer for infinite scroll
  const setSentinel = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      sentinelRef.current = node;
      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting && hasNextPage && !isFetchingRef.current) {
              void fetchNextPage();
            }
          },
          { threshold: 0.1 },
        );
        observerRef.current.observe(node);
      }
    },
    [fetchNextPage, hasNextPage],
  );

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="relative flex flex-col h-full max-h-[calc(100svh-56px)]">
      <div className="ambient-glow" />
      <PageHeader icon={Filter} title="Logs" subtitle={`Session history for ${group}`} />
      <div className="relative px-4 md:px-8 py-4 border-b">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-1.5 self-end pb-2 text-muted-foreground shrink-0">
            <Filter className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Filter</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="log-from" className="text-xs text-muted-foreground">From</Label>
            <Input
              id="log-from"
              type="date"
              className="h-9 text-sm w-40"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="log-to" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="log-to"
              type="date"
              className="h-9 text-sm w-40"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {(from || to) && (
            <button
              className="touch-compact text-xs text-muted-foreground hover:text-foreground underline self-end pb-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              onClick={() => { setFrom(''); setTo(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Log feed */}
      <ScrollArea className="flex-1">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider border-b bg-muted/30 sticky top-0 backdrop-blur-sm">
          <span className="w-28 shrink-0">When</span>
          <span className="flex-1">Session</span>
          <span className="w-20 shrink-0">Source</span>
          <span className="w-10 shrink-0 text-right">Msgs</span>
        </div>

        {isLoading ? (
          <div>
            {Array.from({ length: 15 }).map((_, i) => <LogRowSkeleton key={i} />)}
          </div>
        ) : !allItems.length ? (
          <EmptyState
            icon={MessageSquare}
            title="No logs yet"
            description="A chronological record of all agent sessions and actions across your channels."
          />
        ) : (
          <>
            {allItems.map((entry, idx) => (
              <div
                key={entry.key}
                className={`flex items-center gap-4 px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors duration-150 ${idx % 2 !== 0 ? 'bg-muted/20' : ''}`}
              >
                <span className="w-28 shrink-0 text-muted-foreground tabular-nums text-xs">
                  {relativeTime(entry.startedAt)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-sm font-mono truncate block" title={entry.key}>
                    {entry.key.length > 28 ? `${entry.key.slice(0, 14)}…${entry.key.slice(-10)}` : entry.key}
                  </span>
                  {entry.group && (
                    <span className="text-xs text-muted-foreground">{entry.group}</span>
                  )}
                </span>
                <span className="w-20 shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${channelColor(entry.channel)}`}
                  >
                    {entry.channel}
                  </span>
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
                  {entry.messageCount}
                </span>
              </div>
            ))}

            {isFetchingNextPage && (
              <div>
                {Array.from({ length: 5 }).map((_, i) => <LogRowSkeleton key={i} />)}
              </div>
            )}

            {!hasNextPage && allItems.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">
                All {allItems.length} sessions loaded
              </p>
            )}

            {/* Sentinel for infinite scroll — keep at very end so it triggers before list bottom */}
            <div ref={setSentinel} className="h-1" />
          </>
        )}
      </ScrollArea>

      {/* Stats Row */}
      {allItems.length > 0 && (
        <div className="shrink-0 border-t border-border px-4 md:px-8 py-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Total Entries', value: String(allItems.length), icon: FileText },
              { label: 'This Week', value: '—', icon: Calendar },
              { label: 'Errors', value: '0', icon: AlertCircle },
              { label: 'Success Rate', value: '100%', icon: CheckCircle },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <stat.icon className="h-3.5 w-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
