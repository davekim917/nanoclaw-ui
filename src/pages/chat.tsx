import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Sparkles, Clock, Zap } from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useChatStore, type StreamingEvent } from '@/stores/chat-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { useUiStore } from '@/stores/ui-store';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble, type ChatMessage } from '@/components/chat/message-bubble';
import { ToolSteps, type ToolStep } from '@/components/chat/tool-steps';

// ---- Suggested prompts ----

const SUGGESTED_PROMPTS = [
  { icon: Sparkles, text: 'Summarize my recent activity' },
  { icon: Clock, text: 'What tasks are pending?' },
  { icon: Zap, text: 'What happened today?' },
  { icon: MessageSquare, text: 'Start a new conversation' },
];

function EmptyState({ group, onSend }: { group: string; onSend?: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh] px-6 py-12 text-center animate-in fade-in duration-300">
      <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-md">
        <MessageSquare className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-bold mb-1.5">Chat with {group}</h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Send a message using the input below to start a conversation.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
        {SUGGESTED_PROMPTS.map(({ icon: Icon, text }, idx) => (
          <button
            key={text}
            onClick={() => onSend?.(text)}
            style={{ animationDelay: `${idx * 75}ms` }}
            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm active:scale-[0.98] transition-all duration-150 min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in slide-in-from-bottom-2"
          >
            <Icon className="h-4 w-4 text-primary/60 group-hover:text-primary shrink-0 transition-colors" />
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Streaming parser ----

function parseStreamingEvents(events: StreamingEvent[]): {
  textChunks: string;
  toolSteps: ToolStep[];
  isStreaming: boolean;
} {
  const toolSteps: ToolStep[] = [];
  let text = '';
  let isStreaming = false;

  for (const evt of events) {
    if (evt.type === 'progress' && evt.event) {
      isStreaming = true;
      const inner = evt.event;

      if (inner.eventType === 'text' && inner.data?.text) {
        text += inner.data.text;
        // Mark last running tool as done when text arrives
        const last = [...toolSteps].reverse().find((s: ToolStep) => s.status === 'running');
        if (last) last.status = 'done';
      }

      if (inner.eventType === 'tool_use' && inner.data) {
        // Mark previous running step as done
        const last = [...toolSteps].reverse().find((s: ToolStep) => s.status === 'running');
        if (last) last.status = 'done';

        const toolName = inner.data.name ?? 'tool';
        let input: unknown;
        try { input = JSON.parse(inner.data.input ?? '{}'); } catch { input = {}; }
        toolSteps.push({
          id: `tool-${toolSteps.length}`,
          tool: toolName,
          label: formatToolLabel(toolName, input),
          status: 'running',
        });
      }
    }

    if (evt.type === 'session_end') {
      isStreaming = false;
      for (const step of toolSteps) {
        if (step.status === 'running') step.status = 'done';
      }
    }
  }

  return { textChunks: text, toolSteps, isStreaming };
}

function formatToolLabel(toolName: string, input: unknown): string {
  const lower = toolName.toLowerCase();
  if (lower.includes('search') && input && typeof input === 'object') {
    const q = (input as Record<string, unknown>)['query'];
    if (typeof q === 'string') return `Searching: ${q.slice(0, 40)}`;
  }
  if (lower.includes('read') || lower.includes('file')) return `Reading file…`;
  if (lower.includes('bash') || lower.includes('computer')) return `Running command…`;
  if (lower.includes('fetch') || lower.includes('browser')) return `Fetching page…`;
  if (lower.includes('mail') || lower.includes('gmail')) return `Checking mail…`;
  if (lower.includes('calendar')) return `Checking calendar…`;
  // Title-case the tool name
  return toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) + '…';
}

// ---- Loading skeleton ----

function ChatLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-16 w-72 rounded-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-24 w-80 rounded-lg" />
      </div>
    </div>
  );
}

// ---- API types ----

interface RawMessage {
  id: string;
  sender_jid: string;
  sender_name: string;
  text: string;
  timestamp: string;
  is_from_me?: boolean;
}

interface MessagesResponse {
  data: RawMessage[];
}

// ---- Main component ----

export default function ChatPage() {
  const { group, threadId } = useParams<{ group: string; threadId?: string }>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { send } = useWebSocket();
  const storeGroupJid = useUiStore((s) => s.activeGroupJid);

  // Resolve JID from groups API as fallback
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ groups: Array<{ jid: string; folder: string }> }>('/api/groups'),
    staleTime: 60_000,
  });
  const resolvedJid = storeGroupJid || groupsData?.groups.find((g) => g.folder === group)?.jid || '';

  const setPendingSentText = useChatStore((s) => s.setPendingSentText);
  const pendingSentText = useChatStore((s) => s.pendingSentText);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || !resolvedJid) return;
    setPendingSentText(text.trim());
    send({ type: 'send_message', groupJid: resolvedJid, text: text.trim() });
  }, [send, resolvedJid, setPendingSentText]);

  const { streamingSessionKey, lastSessionKey, streamingEvents } = useChatStore();

  // Fetch existing thread messages — use lastSessionKey as fallback after streaming ends
  const sessionKey = threadId ?? streamingSessionKey ?? lastSessionKey ?? null;

  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: queryKeys.sessionMessages(sessionKey ?? ''),
    queryFn: () => api<MessagesResponse>(`/api/sessions/${sessionKey}/messages`),
    enabled: !!sessionKey,
    staleTime: 30_000,
  });

  // Parse streaming events for live display
  const { textChunks, toolSteps, isStreaming } = useMemo(
    () => parseStreamingEvents(streamingEvents),
    [streamingEvents],
  );

  // Combine persisted messages with optimistic + streaming messages
  const messages: ChatMessage[] = useMemo(() => {
    const persisted: ChatMessage[] = (data?.data ?? []).map((m) => ({
      id: m.id,
      role: (m.sender_jid === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
      timestamp: m.timestamp,
    }));
    const result = [...persisted];
    // Show the user's sent message immediately (optimistic)
    if (pendingSentText) {
      result.push({
        id: '__pending__',
        role: 'user' as const,
        content: pendingSentText,
      });
    }
    // Show streaming assistant response
    if (isStreaming && textChunks) {
      result.push({
        id: '__streaming__',
        role: 'assistant' as const,
        content: textChunks,
      });
    }
    return result;
  }, [data, textChunks, isStreaming, pendingSentText]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, toolSteps.length]);

  const showEmpty = !isLoading && !sessionKey && !isStreaming && !pendingSentText;
  const showSkeleton = isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-5 pb-3 border-b shrink-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">
          {threadId ? 'Thread' : 'Chat'}
        </h1>
        {group && (
          <p className="text-xs text-muted-foreground mt-0.5">{group}</p>
        )}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto">
        {showSkeleton && <ChatLoadingSkeleton />}

        {showEmpty && <EmptyState group={group ?? 'your assistant'} onSend={handleSendMessage} />}

        {!showEmpty && !showSkeleton && (
          <div className="flex flex-col gap-3 px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id ?? idx}
                message={msg}
              />
            ))}

            {/* Tool steps during streaming */}
            {isStreaming && toolSteps.length > 0 && (
              <div className="pl-1">
                <ToolSteps steps={toolSteps} />
              </div>
            )}

            {/* Thinking indicator when waiting for response */}
            {(isStreaming || pendingSentText) && !textChunks && toolSteps.length === 0 && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <span className="inline-flex gap-0.5">
                    <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
