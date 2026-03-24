import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocket } from '@/hooks/use-websocket';
import { useUiStore } from '@/stores/ui-store';

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

  return (
    <div className="border-t bg-background px-4 py-3">
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
          disabled={!text.trim() || !activeGroup}
          size="icon"
          className="shrink-0 self-end"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
