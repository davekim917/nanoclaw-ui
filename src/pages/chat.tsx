import { useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Bot, Eye, Menu } from 'lucide-react';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useChatStore, type StreamingEvent } from '@/stores/chat-store';
import { ChatInput } from '@/components/layout/chat-input';
import { SessionHistoryTrigger } from '@/components/chat/session-sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { useWebSocket } from '@/hooks/use-websocket';
import { useSessionTitle, formatSessionKey } from '@/hooks/use-session-title';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble, type ChatMessage } from '@/components/chat/message-bubble';
import { ToolSteps, type ToolStep } from '@/components/chat/tool-steps';

function EmptyState({ group }: { group: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh] px-6 py-12 text-center animate-in fade-in duration-300">
      <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
        <Bot className="h-7 w-7 text-accent" />
      </div>
      <h2 className="text-xl font-bold mb-1.5">Chat with {group}</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Send a message using the input below to start a conversation.
      </p>
    </div>
  );
}

// ---- Streaming parser ----

/** Extract a short summary from accumulated thinking text */
function summarizeThinking(text: string): string {
  if (!text.trim()) return 'Thinking…';
  // Take the first meaningful sentence
  const firstSentence = text.trim().split(/(?<=[.!?])\s+/)[0];
  if (firstSentence && firstSentence.length > 5) {
    return firstSentence.length > 100 ? firstSentence.slice(0, 97) + '…' : firstSentence;
  }
  return text.trim().length > 100 ? text.trim().slice(0, 97) + '…' : text.trim();
}

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

      if (inner.eventType === 'thinking') {
        const thinkingText = inner.data?.text ?? '';
        const last = toolSteps.length > 0 ? toolSteps[toolSteps.length - 1] : undefined;

        if (last?.tool === 'thinking' && last.status === 'running') {
          // Accumulate thinking text into the current thinking step
          last.label = summarizeThinking(
            (last.label === 'Thinking…' ? '' : last.label) + thinkingText,
          );
        } else {
          // Start a new thinking step; mark previous running step as done
          if (last?.status === 'running') last.status = 'done';
          toolSteps.push({
            id: `thinking-${toolSteps.length}`,
            tool: 'thinking',
            label: thinkingText ? summarizeThinking(thinkingText) : 'Thinking…',
            status: 'running',
          });
        }
      }

      if (inner.eventType === 'text' && inner.data?.text) {
        text += inner.data.text;
        const last = toolSteps.length > 0 ? toolSteps[toolSteps.length - 1] : undefined;
        if (last?.status === 'running') last.status = 'done';
      }

      if (inner.eventType === 'tool_use' && inner.data) {
        const last = toolSteps.length > 0 ? toolSteps[toolSteps.length - 1] : undefined;
        if (last?.status === 'running') last.status = 'done';

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
  return toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) + '…';
}

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

/** Extract just the thread ID from a full session key (e.g. "personal:thread:web-xxx" → "web-xxx") */
function extractThreadId(sessionKey: string | null): string | null {
  if (!sessionKey) return null;
  const match = sessionKey.match(/^.+?:thread:(.+)$/);
  return match ? match[1] : null;
}

// ---- Main component ----

export default function ChatPage() {
  const { group, threadId } = useParams<{ group: string; threadId?: string }>();
  const bottomRef = useRef<HTMLDivElement>(null);
  useWebSocket(); // keep connection alive
  const { toggle: toggleSidebar } = useSidebar();

  const pendingSentText = useChatStore((s) => s.pendingSentText);
  const clearCurrentThread = useChatStore((s) => s.clearCurrentThread);

  // Clear stale thread when navigating to /chat (no threadId)
  useEffect(() => {
    if (!threadId) {
      clearCurrentThread();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const { streamingSessionKey, lastSessionKey, streamingEvents, conversationStartedAt } = useChatStore();

  const sessionKey = threadId ?? streamingSessionKey ?? lastSessionKey ?? null;

  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: queryKeys.sessionMessages(sessionKey ?? ''),
    queryFn: () => api<MessagesResponse>(`/api/sessions/${encodeURIComponent(sessionKey ?? '')}/messages`),
    enabled: !!sessionKey,
    staleTime: 30_000,
  });

  // Determine if this session is read-only (non-web channel)
  // Web sessions have keys containing "web-" in the thread portion
  const isWebSession = !threadId || (threadId.includes(':web-') || threadId.startsWith('web-'));
  const isReadOnly = threadId ? !isWebSession : false;
  const sessionChannel = isWebSession ? 'web' : 'discord';

  // Session title for header
  const sessionTitle = useSessionTitle(threadId ?? '');
  const displayTitle = threadId
    ? sessionTitle ?? formatSessionKey(threadId)
    : 'Chat';

  const { textChunks, toolSteps, isStreaming } = useMemo(
    () => parseStreamingEvents(streamingEvents),
    [streamingEvents],
  );

  const { messages, hasStreamingMsg } = useMemo((): { messages: ChatMessage[]; hasStreamingMsg: boolean } => {
    let persisted: ChatMessage[] = (data?.data ?? []).map((m) => ({
      id: m.id,
      role: (m.sender_jid === 'bot' ? 'assistant' : m.sender_jid === 'tool' ? 'tool' : 'user') as ChatMessage['role'],
      content: m.text,
      timestamp: m.timestamp,
    }));
    if (!threadId && conversationStartedAt) {
      const cutoff = new Date(conversationStartedAt).getTime();
      persisted = persisted.filter((m) => !m.timestamp || new Date(m.timestamp).getTime() >= cutoff);
    }
    const result = [...persisted];
    if (pendingSentText && !persisted.some((m) => m.role === 'user' && m.content === pendingSentText)) {
      result.push({ id: '__pending__', role: 'user', content: pendingSentText });
    }
    let hasStreamingMsg = false;
    if (isStreaming && textChunks) {
      result.push({ id: '__streaming__', role: 'assistant', content: textChunks });
      hasStreamingMsg = true;
    }
    return { messages: result, hasStreamingMsg };
  }, [data, textChunks, isStreaming, pendingSentText, threadId, conversationStartedAt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, toolSteps.length]);

  const showEmpty = !isLoading && !sessionKey && !isStreaming && !pendingSentText;
  const showSkeleton = isLoading && !!sessionKey;

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-4 md:px-6 py-3 shrink-0">
          {/* Mobile sidebar trigger */}
          <button
            onClick={toggleSidebar}
            className="md:hidden touch-compact p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Session history trigger (popover on desktop, sheet on mobile) */}
          <SessionHistoryTrigger activeThreadId={sessionKey ?? undefined} />

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 shrink-0">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{displayTitle}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {isReadOnly ? `Read-only · ${sessionChannel}` : group ? `Conversation with ${group}` : 'NanoClaw AI'}
            </p>
          </div>
        </div>

        {/* Read-only banner */}
        {isReadOnly && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 md:px-6 py-2 text-sm text-muted-foreground shrink-0">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span>Viewing a read-only session from {sessionChannel ?? 'an external channel'}</span>
          </div>
        )}

        {/* Message area */}
        <div className="flex-1 overflow-y-auto">
          {showSkeleton && <ChatLoadingSkeleton />}

          {showEmpty && <EmptyState group={group ?? 'your assistant'} />}

          {!showEmpty && !showSkeleton && (
            <div className="flex flex-col gap-6 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
              {messages.map((msg, idx) => {
                const isStreamingMsg = msg.id === '__streaming__';
                return (
                  <div key={msg.id ?? idx}>
                    {isStreamingMsg && toolSteps.length > 0 && (
                      <div className="mb-2">
                        <ToolSteps steps={toolSteps} />
                      </div>
                    )}
                    {msg.role !== 'tool' && <MessageBubble message={msg} />}
                  </div>
                );
              })}

              {(isStreaming || pendingSentText) && !textChunks && toolSteps.length === 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Bot className="h-4 w-4 text-accent animate-thinking-pulse" />
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-card border border-border px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-accent/80 animate-thinking-dot" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-accent/60 animate-thinking-dot" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-accent/40 animate-thinking-dot" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-sm text-muted-foreground">NanoClaw is thinking</span>
                  </div>
                </div>
              )}

              {isStreaming && toolSteps.length > 0 && !hasStreamingMsg && (
                <ToolSteps steps={toolSteps} />
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Chat input — pass extracted thread ID for continuation (URL or active session) */}
        <ChatInput
          disabled={isReadOnly}
          disabledMessage={`Read-only session from ${sessionChannel}`}
          threadId={extractThreadId(sessionKey) ?? undefined}
        />
      </div>
    </div>
  );
}
