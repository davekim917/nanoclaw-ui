import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocket } from '@/hooks/use-websocket';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [text, setText] = useState('');
  const { send } = useWebSocket();
  const activeGroup = useUiStore((s) => s.activeGroup);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    send({
      type: 'message',
      group: activeGroup,
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

  return (
    <div className="border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] bg-background px-4 py-3">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeGroup
              ? `Message ${activeGroup}… (Enter to send, Shift+Enter for newline)`
              : 'Select a group to start chatting…'
          }
          disabled={!activeGroup}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none flex-1 py-3"
        />
        <Button
          onClick={handleSend}
          disabled={!hasText || !activeGroup}
          size="icon"
          className={cn(
            'shrink-0 self-end transition-all duration-200',
            hasText && activeGroup
              ? 'opacity-100 scale-100'
              : 'opacity-40 scale-95',
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
