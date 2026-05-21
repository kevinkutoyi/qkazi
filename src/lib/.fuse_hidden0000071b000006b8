/**
 * Timezone-aware date utilities. Pure functions — no Node/DB deps.
 *
 * Strategy: Postgres + Prisma always store DateTime in UTC. We format for
 * display using `Intl.DateTimeFormat` with an explicit `timeZone`. To go the
 * other direction — building a UTC Date from a wall-clock time in a given
 * zone — we use a small offset-by-formatting trick (no extra dependency).
 *
 * If `timeZone` is undefined/null/empty everywhere below, formatters fall
 * back to UTC for SSR safety. Callers should pass the user's stored zone
 * when known; otherwise the page renders a generic time and the optional
 * `<TimezoneSync>` component upgrades it on first client render.
 */

export const DEFAULT_TZ = "UTC";

/**
 * Curated IANA list shown in the settings picker. Not exhaustive — users
 * can also type any IANA name in their browser settings if needed.
 */
export const TIMEZONES: { value: string; label: string }[] = [
  { value: "Africa/Nairobi", label: "Nairobi · EAT (UTC+3)" },
  { value: "Africa/Lagos", label: "Lagos · WAT (UTC+1)" },
  { value: "Africa/Cairo", label: "Cairo · EET (UTC+2)" },
  { value: "Africa/Johannesburg", label: "Johannesburg · SAST (UTC+2)" },
  { value: "Europe/London", label: "London · GMT/BST" },
  { value: "Europe/Paris", label: "Paris · CET/CEST" },
  { value: "Europe/Berlin", label: "Berlin · CET/CEST" },
  { value: "America/New_York", label: "New York · ET" },
  { value: "America/Chicago", label: "Chicago · CT" },
  { value: "America/Los_Angeles", label: "Los Angeles · PT" },
  { value: "Asia/Dubai", label: "Dubai · GST (UTC+4)" },
  { value: "Asia/Kolkata", label: "Kolkata · IST (UTC+5:30)" },
  { value: "Asia/Singapore", label: "Singapore · SGT (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo · JST (UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney · AEST/AEDT" },
  { value: "UTC", label: "UTC" },
];

/** Returns a zone string that won't crash Intl.DateTimeFormat. */
function safeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** "Saturday, May 24, 2:00 PM" */
export function formatScheduled(
  date: Date | string | null | undefined,
  tz?: string | null,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: safeZone(tz),
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** "Sat, May 24, 2:00 PM" */
export function formatShort(
  date: Date | string | null | undefined,
  tz?: string | null,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: safeZone(tz),
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** "May 24, 2026" */
export function formatDate(
  date: Date | string | null | undefined,
  tz?: string | null,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: safeZone(tz),
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** Short readable label for a timezone, e.g. "EAT (UTC+3)". */
export function zoneLabel(tz: string | null | undefined): string {
  const z = safeZone(tz);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: z,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return offset ? `${z} (${offset})` : z;
  } catch {
    return z;
  }
}

/**
 * Compute the UTC offset of `date` in `timeZone`, in milliseconds.
 * Positive means the zone is ahead of UTC (e.g. Nairobi → +3h → +10800000).
 */
function getZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const f: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") f[p.type] = Number(p.value);
  }
  const asUTC = Date.UTC(
    f.year,
    f.month - 1,
    f.day,
    f.hour === 24 ? 0 : f.hour,
    f.minute,
    f.second,
  );
  return asUTC - date.getTime();
}

/**
 * Build a UTC Date from a wall-clock "YYYY-MM-DD" + "HH:MM" interpreted in
 * the given IANA `timeZone`. Useful for the form-submit flow where the
 * picker emits date + time strings and we need to round-trip a Date.
 *
 *   dateTimeInZoneToUtc("2026-05-24", "10:00", "Africa/Nairobi")
 *   → Date with UTC time 07:00 on the same day.
 */
export function dateTimeInZoneToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr || "00:00");
  if (!dateMatch || !timeMatch) return null;
  const [, y, m, d] = dateMatch.map(Number) as [number, number, number, number];
  const [, hh, mm] = timeMatch.map(Number) as [number, number, number];
  const zone = safeZone(timeZone);

  // Provisional: pretend the wall-clock time is UTC, then subtract the
  // zone's offset to get the real UTC instant.
  const provisional = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = getZoneOffsetMs(provisional, zone);
  return new Date(provisional.getTime() - offset);
}

/**
 * Inverse of dateTimeInZoneToUtc — extract the wall-clock date/time the
 * given UTC `date` represents when viewed in `timeZone`. Returns ISO-ish
 * strings suitable for `<input type="date">` / `<input type="time">`.
 */
export function dateTimeInZoneStrings(
  date: Date,
  timeZone: string,
): { date: string; time: string } {
  const z = safeZone(timeZone);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: z,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const f: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") f[p.type] = p.value;
  }
  return {
    date: `${f.year}-${f.month}-${f.day}`,
    time: `${f.hour === "24" ? "00" : f.hour}:${f.minute}`,
  };
}

/**
 * "Today" date string ("YYYY-MM-DD") in the given timezone, suitable for
 * `min` on a `<input type="date">`.
 */
export function todayInZone(timeZone: string): string {
  return dateTimeInZoneStrings(new Date(), timeZone).date;
}
