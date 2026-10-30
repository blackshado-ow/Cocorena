/*
 * Date helpers.
 *
 * Timezone policy (documented for the whole app):
 * - Days are LOCAL DAYS for the user. A "day" becomes a stable key "YYYY-MM-DD".
 * - If settings.timezone is set, the key is computed in that IANA zone.
 * - Otherwise we use the device's local calendar (Date local components).
 * - Duration for streak purposes is attributed to the key of the session's
 *   END time (falling back to start), so a late-night session counts for the
 *   day it finished on.
 */

/** "YYYY-MM-DD" for a timestamp in the given zone, or device-local when tz is null. */
export function dayKey(ts: number, tz?: string | null): string {
  if (tz) {
    // en-CA yields YYYY-MM-DD directly.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(ts);
  }
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(tz?: string | null): string {
  return dayKey(Date.now(), tz);
}

function keyToUTC(key: string): number {
  // Parse the key as a plain UTC date so calendar arithmetic has no DST quirks.
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function utcFromKey(key: string): number {
  return keyToUTC(key);
}

/** Calendar-day difference (b - a) in whole days between day keys. */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / 86_400_000);
}

export function addDaysKey(key: string, days: number): string {
  const t = new Date(keyToUTC(key) + days * 86_400_000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === value;
}

export function formatKeyLong(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

export function formatKeyShort(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

/** Weeks start on Monday for a stable grid. */
export function monthMatrix(year: number, month0: number): { key: string; inMonth: boolean }[] {
  const first = `${year}-${String(month0 + 1).padStart(2, "0")}-01`;
  const firstUTC = keyToUTC(first);
  const jsDow = new Date(firstUTC).getUTCDay(); // 0 = Sun
  const offset = (jsDow + 6) % 7;
  const gridStartUTC = firstUTC - offset * 86_400_000;
  const cells: { key: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStartUTC + i * 86_400_000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate(),
    ).padStart(2, "0")}`;
    cells.push({ key, inMonth: d.getUTCMonth() === month0 });
  }
  return cells;
}

export function formatHoursMinutes(ms: number): string {
  const total = Math.floor(ms / 60_000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatMinutesShort(ms: number): string {
  const mins = Math.round(ms / 60_000);
  return `${mins}m`;
}
