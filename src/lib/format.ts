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

/**
 * Parse a `datetime-local` form value as Europe/London wall-clock time and
 * return the matching UTC Date.
 *
 * The browser's `<input type="datetime-local">` submits a string like
 * `"2026-05-15T18:00"` with NO timezone. Naively `new Date(localStr)` parses
 * it as local-to-the-runtime, and on a UTC server that means the user's
 * "18:00" gets stored as `18:00Z`, which then displays as 19:00 on a London
 * page in summer (BST = UTC+1). This helper does the right thing: treats
 * the input as London wall-clock time, computes the correct UTC Date.
 */
export function parseLondonLocal(localStr: string): Date {
  const match = localStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return new Date(NaN);
  const naive = new Date(`${localStr}:00.000Z`);
  if (Number.isNaN(naive.getTime())) return naive;
  // Compute Europe/London's offset from UTC at that wall-clock moment by
  // formatting both the same instant in UTC and London, then taking the diff.
  // Returns minutes to ADD to UTC to get London time (0 in winter, 60 in BST).
  const utcParts = naive.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
  const londonParts = naive.toLocaleString('en-US', { timeZone: 'Europe/London', hour12: false });
  const offsetMinutes = (Date.parse(londonParts) - Date.parse(utcParts)) / 60_000;
  return new Date(naive.getTime() - offsetMinutes * 60_000);
}

/** Round a Date down to the next hour boundary in London time. */
export function startOfDayLondon(d: Date): Date {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '01';
  // Build "YYYY-MM-DDT00:00" interpreted as London local
  return parseLondonLocal(`${get('year')}-${get('month')}-${get('day')}T00:00`);
}

/** Add days to a Date (in milliseconds — DST-safe for "today + N days" purposes). */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}
