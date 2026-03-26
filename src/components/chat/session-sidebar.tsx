import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PenSquare, PanelLeftClose, PanelLeft, History } from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { channelFromJid } from '@/lib/channels';
import { relativeTime } from '@/lib/format';
import { formatSessionKey } from '@/hooks/use-session-title';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface RawHistorySession {
  session_key: string;
  group_folder: string;
  chat_jid: string;
  created_at: string;
  last_activity?: string;
}

interface HistoryResponse {
  data: RawHistorySession[];
  total: number;
}

interface SessionItem {
  key: string;
  channel: string;
  startedAt: string;
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
    return { key: s.session_key, channel, startedAt: s.created_at };
  });

  return { sessions, isLoading };
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
              <button
                key={s.key}
                onClick={() => onSelect(s.key)}
                className={cn(
                  'touch-compact flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
                  activeKey === s.key
                    ? 'bg-accent/10 border-l-2 border-l-accent'
                    : 'hover:bg-muted/50 border-l-2 border-l-transparent',
                )}
              >
                <p className="text-sm font-medium truncate">
                  {formatSessionKey(s.key)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{relativeTime(s.startedAt)}</span>
                  <span className="capitalize">{s.channel}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionSidebarProps {
  activeThreadId?: string;
}

export function SessionSidebar({ activeThreadId }: SessionSidebarProps) {
  const { group } = useParams<{ group: string }>();
  const navigate = useNavigate();
  const open = useUiStore((s) => s.sessionSidebarOpen);
  const setOpen = useUiStore((s) => s.setSessionSidebarOpen);
  const clearCurrentThread = useChatStore((s) => s.clearCurrentThread);

  const { sessions, isLoading } = useGroupSessions(group);

  const handleSelect = (key: string) => {
    void navigate(`/g/${group}/chat/${key}`);
  };

  const handleNewChat = () => {
    clearCurrentThread();
    void navigate(`/g/${group}/chat`);
  };

  return (
    <>
      {/* Desktop: inline collapsible panel */}
      <div
        className={cn(
          'hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0',
          open ? 'w-72' : 'w-0 overflow-hidden',
        )}
      >
        <div className="flex items-center justify-between p-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Sessions
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="touch-compact p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          activeKey={activeThreadId}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Desktop: collapsed toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="hidden md:flex touch-compact absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-r-lg bg-muted border border-l-0 border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
    </>
  );
}

/** Mobile trigger button — renders as part of the chat header */
export function MobileSessionTrigger({ activeThreadId }: { activeThreadId?: string }) {
  const { group } = useParams<{ group: string }>();
  const navigate = useNavigate();
  const clearCurrentThread = useChatStore((s) => s.clearCurrentThread);

  const { sessions, isLoading } = useGroupSessions(group);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="md:hidden touch-compact p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors">
          <History className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          activeKey={activeThreadId}
          onSelect={(key) => void navigate(`/g/${group}/chat/${key}`)}
          onNewChat={() => {
            clearCurrentThread();
            void navigate(`/g/${group}/chat`);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
