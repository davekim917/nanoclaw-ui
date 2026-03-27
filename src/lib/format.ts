/**
 * Shared formatting helpers used across pages.
 */

/**
 * Convert an ISO timestamp to a human-readable relative time string.
 * E.g. "just now", "5m ago", "2h ago", "3d ago".
 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 24 * 7) return `${Math.floor(hrs / 24)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Convert a 5-part cron expression to a human-readable string.
 * Falls back to the raw cron string for unrecognised patterns.
 */
export function humanCron(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;
  const [min, hour, dom, month, dow] = parts;

  if (min === '0' && dom === '*' && month === '*' && dow === '*') {
    return `Every day at ${hour}:00`;
  }
  if (dom === '*' && month === '*' && dow === '*') {
    return `Every hour at :${min.padStart(2, '0')}`;
  }
  if (dom === '*' && month === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dow !== '*' ? (days[parseInt(dow)] ?? dow) : null;
    if (dayName) return `Every ${dayName} at ${hour}:${min.padStart(2, '0')}`;
  }
  return schedule;
}
