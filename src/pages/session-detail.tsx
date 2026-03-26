import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble, type ChatMessage } from '@/components/chat/message-bubble';
import { ToolSteps, type ToolStep } from '@/components/chat/tool-steps';
import { cn } from '@/lib/utils';


interface RawMessage {
  id: string;
  sender_jid: string;
  sender_name?: string;
  text: string;
  timestamp: string;
  is_from_me?: boolean;
}

interface MessagesResponse {
  data: RawMessage[];
  sessionKey?: string;
}


export default function SessionDetailPage() {
  const { group, key } = useParams<{ group: string; key: string }>();

  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: queryKeys.sessionMessages(key ?? ''),
    queryFn: () => api<MessagesResponse>(`/api/sessions/${encodeURIComponent(key ?? '')}/messages`),
    enabled: !!key,
    staleTime: Infinity,
  });

  const messages: ChatMessage[] = (data?.data ?? []).map((m) => ({
    id: m.id,
    role: (m.sender_jid === 'bot' ? 'assistant' : m.sender_jid === 'tool' ? 'tool' : 'user') as ChatMessage['role'],
    content: m.text,
    timestamp: m.timestamp,
  }));

  // Group consecutive tool messages into collapsible step blocks
  const renderedElements = useMemo(() => {
    if (messages.length === 0) return null;

    const elements: React.ReactNode[] = [];
    let toolBatch: ToolStep[] = [];

    const flushTools = () => {
      if (toolBatch.length > 0) {
        elements.push(
          <ToolSteps key={`tools-${elements.length}`} steps={[...toolBatch]} defaultExpanded={false} />
        );
        toolBatch = [];
      }
    };

    for (let idx = 0; idx < messages.length; idx++) {
      const msg = messages[idx];
      if (msg.role === 'tool') {
        toolBatch.push({
          id: msg.id ?? `tool-${idx}`,
          tool: msg.content.indexOf(':') >= 0 ? msg.content.slice(0, msg.content.indexOf(':')) : 'tool',
          label: msg.content,
          status: 'done',
        });
      } else {
        flushTools();
        elements.push(<MessageBubble key={msg.id ?? idx} message={msg} />);
      }
    }
    flushTools();
    return elements;
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-5 pb-3 border-b shrink-0">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/g/${group}/sessions`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-150 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Sessions
            </Link>
          </div>

          {/* Session metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium truncate">{key}</span>
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
            renderedElements
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
