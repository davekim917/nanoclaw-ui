import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocket } from '@/hooks/use-websocket';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  disabled?: boolean;
  disabledMessage?: string;
  threadId?: string;
}

export function ChatInput({ disabled, disabledMessage, threadId: activeThreadId }: ChatInputProps = {}) {
  const [text, setText] = useState('');
  const { send } = useWebSocket();
  const { group: routeGroup } = useParams<{ group?: string }>();
  const storeGroup = useUiStore((s) => s.activeGroup);
  const activeGroup = routeGroup ?? storeGroup;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setPendingSentText = useChatStore((s) => s.setPendingSentText);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !activeGroup) return;

    setPendingSentText(trimmed);
    send({
      type: 'send_message',
      groupFolder: activeGroup,
      ...(activeThreadId ? { threadId: activeThreadId } : {}),
      text: trimmed,
    });
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = text.trim().length > 0;

  if (disabled) {
    return (
      <div className="border-t bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground text-center py-2">
            {disabledMessage ?? 'This session is read-only'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-background/80 backdrop-blur-xl px-4 py-3">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeGroup
              ? `Message ${activeGroup}…`
              : 'Select a group to start chatting…'
          }
          disabled={!activeGroup}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none flex-1 py-3 rounded-xl border-border focus-visible:border-accent focus-visible:ring-accent/20"
        />
        <Button
          onClick={handleSend}
          disabled={!hasText || !activeGroup}
          size="icon"
          className={cn(
            'shrink-0 self-end rounded-xl transition-all duration-200',
            hasText && activeGroup
              ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20 opacity-100 scale-100'
              : 'bg-muted text-muted-foreground opacity-60 scale-95',
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
