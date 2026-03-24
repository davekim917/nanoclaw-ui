import { useRef, useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Filter } from 'lucide-react';

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

// ---- Helpers ----

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 24 * 7) return `${Math.floor(hrs / 24)}d ago`;
  return new Date(iso).toLocaleDateString();
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

  const PAGE_SIZE = 50;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<SessionPage>({
    queryKey: ['logs', group, from, to],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (group) params.set('group', group);
      params.set('limit', String(PAGE_SIZE));
      if (typeof pageParam === 'string' && pageParam) params.set('cursor', pageParam);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return api<SessionPage>(`/api/sessions/history?${params.toString()}`);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

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
            if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          },
          { threshold: 0.1 },
        );
        observerRef.current.observe(node);
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col h-full max-h-[calc(100svh-56px)]">
      {/* Header */}
      <div className="p-6 pb-4 border-b">
        <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Session history for {group}
        </p>
        {/* Date filter */}
        <div className="flex flex-wrap items-end gap-4 mt-4">
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
              className="touch-compact text-xs text-muted-foreground hover:text-foreground underline self-end pb-2"
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
        <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b bg-muted/40 sticky top-0">
          <span className="w-24 shrink-0">Time</span>
          <span className="flex-1">Session</span>
          <span className="w-24 shrink-0">Channel</span>
          <span className="w-12 shrink-0 text-right">Msgs</span>
        </div>

        {isLoading ? (
          <div>
            {Array.from({ length: 15 }).map((_, i) => <LogRowSkeleton key={i} />)}
          </div>
        ) : !allItems.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No sessions yet</p>
            <p className="text-sm mt-1">Session logs will appear here once messages are received</p>
          </div>
        ) : (
          <>
            {allItems.map((entry, idx) => (
              <div
                key={entry.key}
                className={`flex items-center gap-4 px-4 py-2.5 border-b hover:bg-muted/40 transition-colors text-sm ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
              >
                <span className="w-24 shrink-0 text-muted-foreground tabular-nums text-xs">
                  {relativeTime(entry.startedAt)}
                </span>
                <span className="flex-1 font-mono text-xs font-semibold truncate" title={entry.key}>
                  {entry.key.length > 24 ? `${entry.key.slice(0, 12)}…${entry.key.slice(-8)}` : entry.key}
                </span>
                <span className="w-24 shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${channelColor(entry.channel)}`}
                  >
                    {entry.channel}
                  </span>
                </span>
                <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
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
    </div>
  );
}
