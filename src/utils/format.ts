/**
 * Shared formatting utilities for dates, cron expressions, and relative times.
 */

// ── Relative time ────────────────────────────────────────────────────

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * Convert an ISO timestamp or date string to a human-readable relative time.
 * E.g., "2 hours ago", "in 5 minutes", "3 days ago".
 */
export function relativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();
    const absDiff = Math.abs(diff);
    const isFuture = diff < 0;
    const prefix = isFuture ? 'in ' : '';
    const suffix = isFuture ? '' : ' ago';

    if (absDiff < MINUTE) return 'just now';
    if (absDiff < HOUR) {
      const mins = Math.floor(absDiff / MINUTE);
      return `${prefix}${mins} minute${mins !== 1 ? 's' : ''}${suffix}`;
    }
    if (absDiff < DAY) {
      const hours = Math.floor(absDiff / HOUR);
      return `${prefix}${hours} hour${hours !== 1 ? 's' : ''}${suffix}`;
    }
    if (absDiff < DAY * 30) {
      const days = Math.floor(absDiff / DAY);
      return `${prefix}${days} day${days !== 1 ? 's' : ''}${suffix}`;
    }
    // Fall back to formatted date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return timestamp;
  }
}

// ── Cron human-readable ──────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Convert a cron expression to a human-readable string.
 * Handles common patterns; falls back to the raw expression for complex ones.
 */
export function cronToHuman(cron: string): string {
  if (!cron) return 'No schedule';

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every minute: * * * * *
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  // Every N minutes: */N * * * *
  const everyMinMatch = minute.match(/^\*\/(\d+)$/);
  if (everyMinMatch && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyMinMatch[1], 10);
    return `Every ${n} minute${n !== 1 ? 's' : ''}`;
  }

  // Specific minute, every hour: N * * * *
  if (/^\d+$/.test(minute) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every hour at :${minute.padStart(2, '0')}`;
  }

  // Every N hours: 0 */N * * *
  const everyHourMatch = hour.match(/^\*\/(\d+)$/);
  if (minute === '0' && everyHourMatch && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyHourMatch[1], 10);
    return `Every ${n} hour${n !== 1 ? 's' : ''}`;
  }

  // Specific time patterns
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const timeStr = formatTime(h, m);

    // Daily: M H * * *
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Every day at ${timeStr}`;
    }

    // Weekly: M H * * D
    if (dayOfMonth === '*' && month === '*' && /^\d+$/.test(dayOfWeek)) {
      const dayIdx = parseInt(dayOfWeek, 10);
      const dayName = DAY_NAMES[dayIdx] || dayOfWeek;
      return `Every ${dayName} at ${timeStr}`;
    }

    // Monthly: M H D * *
    if (/^\d+$/.test(dayOfMonth) && month === '*' && dayOfWeek === '*') {
      const d = parseInt(dayOfMonth, 10);
      return `Monthly on the ${ordinal(d)} at ${timeStr}`;
    }
  }

  // Fall back to raw expression
  return cron;
}

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h12}:${m} ${ampm}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
