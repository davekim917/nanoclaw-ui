import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, RotateCcw } from 'lucide-react';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string | number;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <button
      onClick={handleCopy}
      className="touch-compact rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="group flex gap-3 flex-row-reverse">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <User className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="relative flex max-w-[80%] flex-col items-end">
        <div className="rounded-2xl px-5 py-3.5 text-sm leading-relaxed bg-accent text-accent-foreground">
          {message.content}
        </div>

        {/* Actions on hover */}
        <div className="mt-1.5 flex items-center gap-2 flex-row-reverse opacity-0 transition-opacity group-hover:opacity-100">
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <CopyButton text={message.content} />
        </div>
      </div>
    </div>
  );
}

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm">{children}</li>,
  code: ({ children, ...props }) => {
    const isInline = !props.className;
    return isInline ? (
      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
    ) : (
      <code className="block rounded bg-muted p-3 text-xs font-mono overflow-x-auto">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground mb-2">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
  a: ({ href, children }) => {
    const safeHref = href && /^https?:\/\//i.test(href) ? href : undefined;
    return safeHref ? (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80">{children}</a>
    ) : <span className="text-accent underline">{children}</span>;
  },
};

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="group flex gap-3">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
        <Bot className="h-4 w-4 text-accent" />
      </div>

      {/* Content */}
      <div className="relative flex max-w-[85%] flex-col">
        <div className="rounded-2xl bg-card border border-border px-5 py-3.5 text-sm leading-relaxed text-foreground">
          <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
        </div>

        {/* Actions on hover */}
        <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <CopyButton text={message.content} />
          <button className="touch-compact rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserBubble message={message} />;
  }
  return <AssistantBubble message={message} />;
}
