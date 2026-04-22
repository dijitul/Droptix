/**
 * UK-native date/time formatting. Conventions from the UI brief:
 *   "Fri 7 Nov · 8:00pm"  — event meta
 *   "2025-11-07T19:30+00:00" — schema.org ISO
 *   DD MMM YYYY — longer form
 */

const LONDON: Intl.DateTimeFormatOptions = { timeZone: 'Europe/London' };

export function formatEventDate(d: Date): string {
  const day = new Intl.DateTimeFormat('en-GB', { ...LONDON, weekday: 'short' }).format(d);
  const date = new Intl.DateTimeFormat('en-GB', {
    ...LONDON,
    day: 'numeric',
    month: 'short',
  }).format(d);
  return `${day} ${date}`;
}

export function formatEventTime(d: Date): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    ...LONDON,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return time.replace(' ', '').replace('am', 'am').replace('pm', 'pm');
}

export function formatEventDateTime(d: Date): string {
  return `${formatEventDate(d)} · ${formatEventTime(d)}`;
}

export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    ...LONDON,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** ISO 8601 with Europe/London offset — for <time datetime> + schema.org */
export function toIsoLondon(d: Date): string {
  return d.toISOString();
}
