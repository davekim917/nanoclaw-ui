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

/** @deprecated Use ChannelIcon component instead */
export function channelIcon(channel: string): string {
  const icons: Record<string, string> = { discord: '💬', whatsapp: '📱', slack: '💼', telegram: '✈️', web: '🌐' };
  return icons[channel.toLowerCase()] ?? '🔌';
}

/** Derive channel type from a JID string. */
export function channelFromJid(jid: string): string {
  if (jid.startsWith('dc:')) return 'discord';
  if (jid.startsWith('slack:')) return 'slack';
  if (jid.startsWith('tg:')) return 'telegram';
  if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) return 'whatsapp';
  return 'web';
}

// ---- Folder types & builder (shared by sidebar + mobile-nav) ----

export interface FolderChannel {
  jid: string;
  channel: string;
  name: string;
}

export interface Folder {
  folder: string;
  name: string;
  channels: FolderChannel[];
}

export interface CapabilitiesResponse {
  folders?: Folder[];
  groups: Array<{ jid: string; name: string; folder: string; channel: string }>;
}

/** Build a deduplicated folder list from capabilities, filtering server-level Discord entries. */
export function buildFolders(capData: CapabilitiesResponse | undefined): Folder[] {
  const raw: Folder[] = capData?.folders ?? (capData?.groups ?? []).reduce<Folder[]>((acc, g) => {
    let folder = acc.find((f) => f.folder === g.folder);
    if (!folder) {
      folder = { folder: g.folder, name: g.name || g.folder, channels: [] };
      acc.push(folder);
    }
    const ch = g.channel || channelFromJid(g.jid);
    if (!folder.channels.some((c) => c.channel === ch)) {
      folder.channels.push({ jid: g.jid, channel: ch, name: g.name });
    }
    return acc;
  }, []);
  return raw.filter((f) => !f.folder.startsWith('discord_') && !f.folder.startsWith('__'));
}
