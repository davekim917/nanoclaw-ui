/**
 * Shared channel colour/style helpers used across pages.
 */

export const channelStyles: Record<string, { label: string; className: string }> = {
  discord: { label: 'Discord', className: 'bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20' },
  whatsapp: { label: 'WhatsApp', className: 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20' },
  slack: { label: 'Slack', className: 'bg-[#E01E5A]/10 text-[#E01E5A] border-[#E01E5A]/20' },
  telegram: { label: 'Telegram', className: 'bg-[#229ED9]/10 text-[#229ED9] border-[#229ED9]/20' },
  web: { label: 'Web', className: 'bg-muted text-muted-foreground' },
};

/**
 * Return the Tailwind class string for a channel badge.
 * Falls back to a generic muted style for unknown channels.
 */
export function channelBadgeClass(channel: string): string {
  return channelStyles[channel.toLowerCase()]?.className ?? 'bg-muted text-muted-foreground';
}

const channelIcons: Record<string, string> = {
  discord: '💬',
  whatsapp: '📱',
  slack: '💼',
  telegram: '✈️',
  web: '🌐',
};

/** Return a small emoji for a channel type. */
export function channelIcon(channel: string): string {
  return channelIcons[channel.toLowerCase()] ?? '🔌';
}

/** Derive channel type from a JID string. */
export function channelFromJid(jid: string): string {
  if (jid.startsWith('dc:')) return 'discord';
  if (jid.startsWith('slack:')) return 'slack';
  if (jid.startsWith('tg:')) return 'telegram';
  if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) return 'whatsapp';
  return 'web';
}
