import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PenSquare, History } from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { channelFromJid } from '@/lib/channels';
import { relativeTime } from '@/lib/format';
import { truncateTitle } from '@/hooks/use-session-title';
import { useChatStore } from '@/stores/chat-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RawHistorySession {
  session_key: string;
  group_folder: string;
  chat_jid: string;
  created_at: string;
  last_activity?: string;
  first_message?: string | null;
}

interface HistoryResponse {
  data: RawHistorySession[];
  total: number;
}

interface SessionItem {
  key: string;
  group: string;
  channel: string;
  startedAt: string;
  title: string | null;
}

const CHANNEL_FILTERS = ['All', 'Web', 'Discord', 'Slack'] as const;

/** Shared hook for fetching session history — avoids duplicate queries */
function useGroupSessions(group: string | undefined) {
  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: queryKeys.sessionHistory(group ?? ''),
    queryFn: () => api<HistoryResponse>(`/api/sessions/history?group=${encodeURIComponent(group ?? '')}&limit=50&offset=0`),
    enabled: !!group,
    staleTime: 30_000,
  });

  const sessions: SessionItem[] = (data?.data ?? []).map((s) => {
    const channel = channelFromJid(s.chat_jid);
    const msg = s.first_message?.trim();
    const title = msg ? truncateTitle(msg) : null;
    return { key: s.session_key, group: s.group_folder, channel, startedAt: s.created_at, title };
  });

  return { sessions, isLoading };
}

function SessionButton({
  session: s,
  isActive,
  onSelect,
}: {
  session: SessionItem;
  isActive: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(s.key)}
      className={cn(
        'touch-compact flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
        isActive
          ? 'bg-accent/10 border-l-2 border-l-accent'
          : 'hover:bg-muted/50 border-l-2 border-l-transparent',
      )}
    >
      <p className="text-sm font-medium truncate">
        {s.title ?? `${relativeTime(s.startedAt)} · ${s.channel.charAt(0).toUpperCase() + s.channel.slice(1)}`}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {s.title && <span>{relativeTime(s.startedAt)}</span>}
        <span className="truncate max-w-[100px]">{s.group}</span>
        <span className="capitalize">{s.channel}</span>
      </div>
    </button>
  );
}

function SessionList({
  sessions,
  isLoading,
  activeKey,
  onSelect,
  onNewChat,
}: {
  sessions: SessionItem[];
  isLoading: boolean;
  activeKey?: string;
  onSelect: (key: string) => void;
  onNewChat: () => void;
}) {
  const [filter, setFilter] = useState<string>('All');

  const filtered = filter === 'All'
    ? sessions
    : sessions.filter((s) => s.channel.toLowerCase() === filter.toLowerCase());

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          size="sm"
        >
          <PenSquare className="h-4 w-4" />
          New Chat
        </Button>

        <div className="flex gap-1 overflow-x-auto">
          {CHANNEL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'touch-compact whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No sessions found
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((s) => (
              <SessionButton
                key={s.key}
                session={s}
                isActive={activeKey === s.key}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Session history trigger — renders in the chat header.
 * Desktop: opens a popover dropdown with session list.
 * Mobile: opens a sheet from the left.
 */
export function SessionHistoryTrigger({ activeThreadId }: { activeThreadId?: string }) {
  const { group } = useParams<{ group: string }>();
  const navigate = useNavigate();
  const clearCurrentThread = useChatStore((s) => s.clearCurrentThread);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { sessions, isLoading } = useGroupSessions(group);

  const handleSelect = (key: string) => {
    setPopoverOpen(false);
    setSheetOpen(false);
    void navigate(`/g/${group}/chat/${key}`);
  };

  const handleNewChat = () => {
    setPopoverOpen(false);
    setSheetOpen(false);
    clearCurrentThread();
    void navigate(`/g/${group}/chat`);
  };

  return (
    <>
      {/* Desktop: popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="hidden md:flex touch-compact items-center gap-1.5 px-2 py-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            <History className="h-4 w-4" />
            <span className="text-xs font-medium">History</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0 max-h-[70vh] overflow-y-auto">
          <SessionList
            sessions={sessions}
            isLoading={isLoading}
            activeKey={activeThreadId}
            onSelect={handleSelect}
            onNewChat={handleNewChat}
          />
        </PopoverContent>
      </Popover>

      {/* Mobile: sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden touch-compact p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors" aria-label="Session history">
            <History className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Session history</SheetTitle>
          <SessionList
            sessions={sessions}
            isLoading={isLoading}
            activeKey={activeThreadId}
            onSelect={handleSelect}
            onNewChat={handleNewChat}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
