import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocket } from '@/hooks/use-websocket';
import { useUiStore } from '@/stores/ui-store';
import { useChatStore } from '@/stores/chat-store';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [text, setText] = useState('');
  const { send } = useWebSocket();
  const { group: routeGroup } = useParams<{ group?: string }>();
  const storeGroup = useUiStore((s) => s.activeGroup);
  const storeGroupJid = useUiStore((s) => s.activeGroupJid);
  const setActiveGroup = useUiStore((s) => s.setActiveGroup);
  // Prefer the URL param (most specific context) over the stored group
  const activeGroup = routeGroup ?? storeGroup;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resolve JID from groups API as fallback when store doesn't have it
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ groups: Array<{ jid: string; name: string; folder: string }> }>('/api/groups'),
    staleTime: 60_000,
  });

  const resolvedJid = storeGroupJid || groupsData?.groups.find((g) => g.folder === activeGroup)?.jid || '';

  // Sync JID to store when resolved from API
  useEffect(() => {
    if (resolvedJid && !storeGroupJid && activeGroup) {
      setActiveGroup(activeGroup, resolvedJid);
    }
  }, [resolvedJid, storeGroupJid, activeGroup, setActiveGroup]);

  const setPendingSentText = useChatStore((s) => s.setPendingSentText);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !resolvedJid) return;

    setPendingSentText(trimmed);
    send({
      type: 'send_message',
      groupJid: resolvedJid,
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
              ? `Message ${activeGroup}…`
              : 'Select a group to start chatting…'
          }
          disabled={!activeGroup}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none flex-1 py-3"
        />
        <Button
          onClick={handleSend}
          disabled={!hasText || !resolvedJid}
          size="icon"
          className={cn(
            'shrink-0 self-end transition-all duration-200',
            hasText && resolvedJid
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
