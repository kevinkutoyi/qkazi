"use client";

import { useMemo, useState } from "react";

/**
 * Lightweight month-grid date picker. All math happens on YYYY-MM-DD strings
 * (no Date arithmetic at midnight boundaries) so it doesn't drift across
 * timezones. The displayed "today"/min comparisons use the consumer-provided
 * `today` / `minDate` strings instead of `new Date()` for the same reason.
 *
 * Emits the picked date as "YYYY-MM-DD" via onChange.
 */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function ymdToParts(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function partsToYmd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(y: number, m: number): number {
  // m is 1-indexed; use day 0 of m+1 to get last day of m
  return new Date(y, m, 0).getDate();
}

function firstWeekday(y: number, m: number): number {
  // 0 (Sun) .. 6 (Sat)
  return new Date(y, m - 1, 1).getDay();
}

export default function Calendar({
  value,
  onChange,
  today,
  minDate,
}: {
  /** "YYYY-MM-DD" or null. */
  value: string | null;
  onChange: (date: string) => void;
  /** Today's date in the consumer's preferred zone, "YYYY-MM-DD". */
  today: string;
  /** Earliest selectable date, "YYYY-MM-DD". Defaults to `today`. */
  minDate?: string;
}) {
  const todayParts = ymdToParts(today) ?? { y: 2026, m: 1, d: 1 };
  const minStr = minDate ?? today;

  // The "viewed month" — what's shown in the grid. Initialized to the
  // selected date if any, else today.
  const initialView = ymdToParts(value ?? today) ?? todayParts;
  const [viewY, setViewY] = useState(initialView.y);
  const [viewM, setViewM] = useState(initialView.m);

  function prev() {
    if (viewM === 1) {
      setViewM(12);
      setViewY((y) => y - 1);
    } else {
      setViewM((m) => m - 1);
    }
  }
  function next() {
    if (viewM === 12) {
      setViewM(1);
      setViewY((y) => y + 1);
    } else {
      setViewM((m) => m + 1);
    }
  }

  const grid = useMemo(() => {
    const firstWD = firstWeekday(viewY, viewM);
    const total = daysInMonth(viewY, viewM);
    const cells: ({ day: number; ymd: string } | null)[] = [];
    for (let i = 0; i < firstWD; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push({ day: d, ymd: partsToYmd(viewY, viewM, d) });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewY, viewM]);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Previous month"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06L7.47 10.6a.75.75 0 010-1.06l4.26-4.31a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-gray-900">
          {MONTHS[viewM - 1]} {viewY}
        </div>
        <button
          type="button"
          onClick={next}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Next month"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M7.21 5.23a.75.75 0 011.06 0l4.26 4.31a.75.75 0 010 1.06L8.27 14.77a.75.75 0 11-1.06-1.06L10.94 10 7.21 6.29a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell) return <div key={i} className="h-9" />;
          const isSelected = value === cell.ymd;
          const isToday = today === cell.ymd;
          const isPast = cell.ymd < minStr;
          return (
            <button
              key={cell.ymd}
              type="button"
              disabled={isPast}
              onClick={() => onChange(cell.ymd)}
              className={[
                "h-9 rounded text-sm transition",
                isPast
                  ? "cursor-not-allowed text-gray-300"
                  : "text-gray-800 hover:bg-brand-50 hover:text-brand-700",
                isSelected
                  ? "bg-brand-600 text-white hover:bg-brand-700 hover:text-white"
                  : "",
                isToday && !isSelected
                  ? "ring-1 ring-inset ring-brand-400"
                  : "",
              ].join(" ")}
              aria-pressed={isSelected}
              aria-label={cell.ymd}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
