import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface RawMessage {
  id: string;
  sender_jid: string;
  text: string;
  is_from_me?: boolean;
}

interface MessagesResponse {
  data: RawMessage[];
}

/**
 * Fetches the first user message for a session and returns a truncated
 * version as a human-readable title. Falls back to a formatted key.
 */
export function useSessionTitle(sessionKey: string): string | undefined {
  const { data } = useQuery({
    queryKey: ['session-title', sessionKey],
    queryFn: async () => {
      const res = await api<MessagesResponse>(`/api/sessions/${sessionKey}/messages?limit=5`);
      const msgs = res.data ?? [];
      const firstUserMsg = msgs.find(
        (m) => m.sender_jid !== 'bot' && !m.is_from_me,
      ) ?? msgs.find((m) => m.sender_jid !== 'bot');
      const msg = firstUserMsg ?? msgs[0];
      if (!msg?.text) return null;
      const text = msg.text.trim();
      return text.length > 60 ? text.slice(0, 57) + '...' : text;
    },
    staleTime: 5 * 60_000, // titles don't change — cache for 5 min
    retry: false,
  });

  return data ?? undefined;
}

/** Truncate a string to maxLen characters, adding an ellipsis if needed. */
export function truncateTitle(text: string, maxLen = 50): string {
  if (!text) return '';
  const trimmed = text.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen - 1) + '…' : trimmed;
}

/** Format a raw session key into something shorter and readable as a fallback. */
export function formatSessionKey(key: string): string {
  // "personal:thread:web-1774414518912-c808ddb1" → "web-17744...ddb1"
  const parts = key.split(':');
  const last = parts[parts.length - 1];
  if (last.length > 20) {
    return last.slice(0, 10) + '...' + last.slice(-4);
  }
  return last;
}
