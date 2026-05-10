/**
 * Formatting Utilities
 *
 * Pure formatting functions — no React, no DB.
 */

/**
 * Formats a numeric modifier with a leading sign: +3, -1, +0.
 * Returns "—" for null/undefined.
 */
export function formatMod(n: number | undefined | null): string {
  if (n == null) return '—';
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Formats a Unix timestamp as a short date + time string.
 * Example: "May 9, 02:15 PM"
 */
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a Unix timestamp as a time-only string.
 * Example: "02:15:30 PM"
 */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
