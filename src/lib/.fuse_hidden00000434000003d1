import { z } from "zod";

/**
 * Working-hours data model. Stored as JSON on TaskerProfile.workingHours.
 *
 * Times are wall-clock "HH:MM" strings interpreted in the tasker's own
 * timezone (TaskerProfile's owning user's User.timezone). That keeps the
 * model timezone-agnostic in the DB; rendering and "is the tasker available
 * at instant X" checks combine the two.
 */
export const DAYS = [
  { key: "monday", label: "Monday", short: "Mon", jsDay: 1 },
  { key: "tuesday", label: "Tuesday", short: "Tue", jsDay: 2 },
  { key: "wednesday", label: "Wednesday", short: "Wed", jsDay: 3 },
  { key: "thursday", label: "Thursday", short: "Thu", jsDay: 4 },
  { key: "friday", label: "Friday", short: "Fri", jsDay: 5 },
  { key: "saturday", label: "Saturday", short: "Sat", jsDay: 6 },
  { key: "sunday", label: "Sunday", short: "Sun", jsDay: 0 },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];

export interface DayHours {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export type WorkingHours = Record<DayKey, DayHours>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z
  .object({
    enabled: z.boolean(),
    start: z.string().regex(TIME_RE, "Use HH:MM"),
    end: z.string().regex(TIME_RE, "Use HH:MM"),
  })
  .refine(
    (d) => !d.enabled || d.start < d.end,
    "End time must be after start time",
  );

export const workingHoursSchema = z.object(
  Object.fromEntries(DAYS.map((d) => [d.key, dayHoursSchema])) as Record<
    DayKey,
    typeof dayHoursSchema
  >,
);

export function defaultWorkingHours(): WorkingHours {
  // Sensible default: Mon–Fri 09:00–17:00, weekends off.
  const fivePlus = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  return Object.fromEntries(
    DAYS.map((d) => [
      d.key,
      {
        enabled: fivePlus.includes(d.key),
        start: "09:00",
        end: "17:00",
      },
    ]),
  ) as WorkingHours;
}

/**
 * Coerce an unknown value (e.g. from the JSON column) into a WorkingHours.
 * Falls back to the default schedule on anything malformed — we never throw
 * on stored data, because the column came from a previous version of the
 * code and shouldn't break the page on read.
 */
export function readWorkingHours(value: unknown): WorkingHours {
  const parsed = workingHoursSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return defaultWorkingHours();
}

/**
 * Render a compact summary string like "Mon–Fri 9 AM–5 PM · Sat 10 AM–2 PM"
 * for the public tasker profile. Collapses consecutive identical days into
 * ranges; omits closed days.
 */
export function summarizeWorkingHours(wh: WorkingHours): string {
  // Build a list of {day, hours-string} for enabled days, in week order.
  const items: { short: string; hh: string; key: string }[] = [];
  for (const d of DAYS) {
    const h = wh[d.key];
    if (!h.enabled) continue;
    items.push({
      short: d.short,
      hh: `${formatHour(h.start)}–${formatHour(h.end)}`,
      key: d.key,
    });
  }
  if (items.length === 0) return "Not currently accepting bookings";

  // Collapse runs of consecutive days with identical hours.
  const groups: { from: string; to: string; hh: string }[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.hh === it.hh) {
      last.to = it.short;
    } else {
      groups.push({ from: it.short, to: it.short, hh: it.hh });
    }
  }
  return groups
    .map((g) =>
      g.from === g.to ? `${g.from} ${g.hh}` : `${g.from}–${g.to} ${g.hh}`,
    )
    .join(" · ");
}

function formatHour(hhmm: string): string {
  const [hRaw, m] = hhmm.split(":");
  const h = Number(hRaw);
  if (Number.isNaN(h)) return hhmm;
  const am = h < 12;
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === "00"
    ? `${display} ${am ? "AM" : "PM"}`
    : `${display}:${m} ${am ? "AM" : "PM"}`;
}

/**
 * Convert a "YYYY-MM-DD" string to a UTC Date at 00:00. Used for
 * AvailabilityBlock startDate/endDate which we treat as day-only.
 */
export function parseDayUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

/** Format a stored Date back to "YYYY-MM-DD" using UTC components. */
export function formatDayUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Human-friendly "May 15 – May 20" range (or single date) in UTC. */
export function formatBlockRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
  const s = fmt.format(start);
  const e = fmt.format(end);
  return s === e ? s : `${s} – ${e}`;
}
