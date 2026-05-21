"use client";

import { useEffect, useMemo, useState } from "react";
import Calendar from "./Calendar";
import {
  dateTimeInZoneStrings,
  dateTimeInZoneToUtc,
  todayInZone,
  zoneLabel,
} from "@/lib/datetime";

/**
 * Default time chips, 09:00 → 19:00 on the hour. Plenty for an MVP — easy
 * to extend to half-hour slots or per-tasker availability later.
 */
const DEFAULT_TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

function formatHourLabel(hhmm: string): string {
  const [h] = hhmm.split(":").map(Number);
  const am = h < 12;
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${am ? "AM" : "PM"}`;
}

export default function DateTimePicker({
  value,
  onChange,
  timezone,
  mode = "datetime",
  required,
}: {
  /** Current UTC Date, or null. */
  value: Date | null;
  onChange: (d: Date | null) => void;
  /** IANA timezone the user wants to schedule in. */
  timezone: string;
  /** "datetime" shows time slots; "date" hides them and defaults to 09:00. */
  mode?: "datetime" | "date";
  required?: boolean;
}) {
  // Internal state keeps date and time as strings; we lift to a UTC Date
  // whenever both are present.
  const today = useMemo(() => todayInZone(timezone), [timezone]);
  const initial = useMemo(
    () => (value ? dateTimeInZoneStrings(value, timezone) : null),
    // We only want to derive once from the initial value; subsequent edits
    // are owned by this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [dateStr, setDateStr] = useState<string | null>(initial?.date ?? null);
  const [timeStr, setTimeStr] = useState<string>(
    initial?.time ?? (mode === "date" ? "09:00" : ""),
  );

  // Re-emit the UTC Date whenever the user picks new pieces. We only fire
  // onChange when *both* parts are present in datetime mode.
  useEffect(() => {
    if (!dateStr) {
      onChange(null);
      return;
    }
    if (mode === "datetime" && !timeStr) {
      onChange(null);
      return;
    }
    const utc = dateTimeInZoneToUtc(
      dateStr,
      mode === "date" ? "09:00" : timeStr,
      timezone,
    );
    onChange(utc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, timeStr, timezone, mode]);

  return (
    <div className="space-y-3">
      <Calendar
        value={dateStr}
        onChange={setDateStr}
        today={today}
        minDate={today}
      />

      {mode === "datetime" ? (
        <div>
          <label className="label">Time</label>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
            {DEFAULT_TIME_SLOTS.map((slot) => {
              const selected = timeStr === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeStr(slot)}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  aria-pressed={selected}
                >
                  {formatHourLabel(slot)}
                </button>
              );
            })}
            <div className="col-span-4 sm:col-span-6">
              <label className="mt-2 block text-xs text-gray-500">
                Or pick a custom time:
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="input mt-1"
                aria-label="Custom time"
              />
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-gray-500">
        Times shown in <strong>{zoneLabel(timezone)}</strong>. Change your
        timezone in{" "}
        <a href="/settings" className="text-brand-700 hover:underline">
          settings
        </a>
        .
      </p>

      {required && (!dateStr || (mode === "datetime" && !timeStr)) ? (
        <p className="text-xs text-yellow-700">Pick a date and time.</p>
      ) : null}
    </div>
  );
}
