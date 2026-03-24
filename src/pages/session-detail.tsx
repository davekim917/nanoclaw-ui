import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble, type ChatMessage } from '@/components/chat/message-bubble';
import { cn } from '@/lib/utils';

interface SessionMeta {
  key?: string;
  group?: string;
  channel?: string;
  startedAt?: string;
  endedAt?: string;
  messageCount?: number;
}

interface MessagesResponse {
  messages: ChatMessage[];
  session?: SessionMeta;
}

const channelStyles: Record<string, string> = {
  discord: 'bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20',
  whatsapp: 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20',
  slack: 'bg-[#E01E5A]/10 text-[#E01E5A] border-[#E01E5A]/20',
  telegram: 'bg-[#229ED9]/10 text-[#229ED9] border-[#229ED9]/20',
};

function ChannelBadge({ channel }: { channel?: string }) {
  const lower = (channel ?? '').toLowerCase();
  const className = channelStyles[lower] ?? 'bg-muted text-muted-foreground';
  return (
    <Badge
      variant="outline"
      className={cn('capitalize text-xs', className)}
    >
      {channel ?? 'unknown'}
    </Badge>
  );
}

export default function SessionDetailPage() {
  const { group, key } = useParams<{ group: string; key: string }>();

  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: queryKeys.sessionMessages(key ?? ''),
    queryFn: () => api<MessagesResponse>(`/api/sessions/${key}/messages`),
    enabled: !!key,
    staleTime: 30_000,
  });

  const messages = data?.messages ?? [];
  const session = data?.session;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 pb-3 border-b shrink-0">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/g/${group}/sessions`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Sessions
            </Link>
          </div>

          {/* Session metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-mono font-medium truncate">{key}</span>
            {session?.channel && <ChannelBadge channel={session.channel} />}
            {session?.group && (
              <span className="text-xs text-muted-foreground">{session.group}</span>
            )}
            {session?.startedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(session.startedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">
          {isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}
                >
                  <Skeleton
                    className={cn(
                      'rounded-2xl',
                      i % 2 === 0 ? 'h-10 w-48' : 'h-16 w-64',
                    )}
                  />
                </div>
              ))}
            </>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No messages in this session</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={msg.id ?? idx} message={msg} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
