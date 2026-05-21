"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DAYS,
  defaultWorkingHours,
  WorkingHours,
  type DayKey,
} from "@/lib/availability";

type TimeOffBlock = {
  id: string;
  startDate: string; // ISO
  endDate: string; // ISO
  reason: string | null;
  label: string;
  expired: boolean;
};

export default function AvailabilityForm({
  userId,
  initialWorkingHours,
  initialTimeOff,
}: {
  userId: string;
  initialWorkingHours: WorkingHours;
  initialTimeOff: TimeOffBlock[];
}) {
  const router = useRouter();
  const [hours, setHours] = useState<WorkingHours>(initialWorkingHours);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursMessage, setHoursMessage] =
    useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [blocks, setBlocks] = useState<TimeOffBlock[]>(initialTimeOff);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  function setDay(key: DayKey, patch: Partial<WorkingHours[DayKey]>) {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setHoursMessage(null);
  }

  async function saveHours(e: React.FormEvent) {
    e.preventDefault();
    setHoursMessage(null);

    // Light client-side validation: end > start for every enabled day.
    for (const d of DAYS) {
      const h = hours[d.key];
      if (h.enabled && h.start >= h.end) {
        setHoursMessage({
          kind: "error",
          text: `${d.label}: end time must be after start time.`,
        });
        return;
      }
    }

    setSavingHours(true);
    try {
      const res = await fetch(`/api/taskers/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours: hours }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHoursMessage({
          kind: "error",
          text: data.error ?? "Could not save",
        });
        return;
      }
      setHoursMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch {
      setHoursMessage({ kind: "error", text: "Network error" });
    } finally {
      setSavingHours(false);
    }
  }

  function resetToDefault() {
    setHours(defaultWorkingHours());
    setHoursMessage(null);
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setBlockError(null);
    if (!newStart || !newEnd) {
      setBlockError("Pick a start and end date.");
      return;
    }
    if (newStart > newEnd) {
      setBlockError("End date must be on or after start.");
      return;
    }
    setAddingBlock(true);
    try {
      const res = await fetch(`/api/taskers/${userId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: newStart,
          endDate: newEnd,
          reason: newReason.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBlockError(data.error ?? "Could not add");
        return;
      }
      setNewStart("");
      setNewEnd("");
      setNewReason("");
      // The server returns the created row; the parent page rerenders on
      // refresh which will give us the canonical labels. For snappy UX,
      // optimistically insert.
      setBlocks((prev) => [
        ...prev,
        {
          id: data.block.id,
          startDate: data.block.startDate,
          endDate: data.block.endDate,
          reason: data.block.reason,
          label: formatRangeLocal(data.block.startDate, data.block.endDate),
          expired: false,
        },
      ]);
      router.refresh();
    } catch {
      setBlockError("Network error");
    } finally {
      setAddingBlock(false);
    }
  }

  async function removeBlock(id: string) {
    const prev = blocks;
    setBlocks((b) => b.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/taskers/${userId}/availability/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Revert.
        setBlocks(prev);
      } else {
        router.refresh();
      }
    } catch {
      setBlocks(prev);
    }
  }

  return (
    <div className="space-y-6">
      {/* Working hours */}
      <section className="card p-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Weekly working hours</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Toggle each day on or off and set your hours. Times are in your
              local timezone.
            </p>
          </div>
          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs text-brand-700 hover:underline"
          >
            Reset to default
          </button>
        </header>

        <form onSubmit={saveHours} className="space-y-3">
          <ul className="space-y-2">
            {DAYS.map((d) => {
              const h = hours[d.key];
              return (
                <li
                  key={d.key}
                  className={`flex flex-wrap items-center gap-3 rounded-md border p-3 ${
                    h.enabled
                      ? "border-gray-200 bg-white"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <label className="flex w-32 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) =>
                        setDay(d.key, { enabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium text-gray-900">
                      {d.label}
                    </span>
                  </label>
                  <div className="flex flex-1 items-center gap-2">
                    <label className="sr-only" htmlFor={`${d.key}-start`}>
                      {d.label} start
                    </label>
                    <input
                      id={`${d.key}-start`}
                      type="time"
                      value={h.start}
                      onChange={(e) =>
                        setDay(d.key, { start: e.target.value })
                      }
                      disabled={!h.enabled}
                      className="input max-w-[120px]"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <label className="sr-only" htmlFor={`${d.key}-end`}>
                      {d.label} end
                    </label>
                    <input
                      id={`${d.key}-end`}
                      type="time"
                      value={h.end}
                      onChange={(e) =>
                        setDay(d.key, { end: e.target.value })
                      }
                      disabled={!h.enabled}
                      className="input max-w-[120px]"
                    />
                  </div>
                  {!h.enabled ? (
                    <span className="ml-auto text-xs text-gray-500">Off</span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {hoursMessage ? (
            <p
              className={`text-sm ${
                hoursMessage.kind === "ok"
                  ? "text-brand-700"
                  : "text-red-600"
              }`}
            >
              {hoursMessage.text}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={savingHours}
            >
              {savingHours ? "Saving…" : "Save working hours"}
            </button>
          </div>
        </form>
      </section>

      {/* Time off */}
      <section className="card p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold">Unavailable dates</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Block off vacation, sick days, or anything else. Customers see
            these as &quot;unavailable&quot; on your profile.
          </p>
        </header>

        {blocks.length === 0 ? (
          <p className="text-sm text-gray-600">
            No time-off blocks yet. Add one below.
          </p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((b) => (
              <li
                key={b.id}
                className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                  b.expired
                    ? "border-gray-100 bg-gray-50 text-gray-500"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {b.label}{" "}
                    {b.expired ? (
                      <span className="ml-1 text-xs text-gray-500">(past)</span>
                    ) : null}
                  </p>
                  {b.reason ? (
                    <p className="mt-0.5 text-xs text-gray-500">{b.reason}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeBlock(b.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={addBlock}
          className="mt-5 space-y-3 border-t border-gray-100 pt-5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="off-from">
                From
              </label>
              <input
                id="off-from"
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="off-to">
                To
              </label>
              <input
                id="off-to"
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="off-reason">
              Reason (optional)
            </label>
            <input
              id="off-reason"
              maxLength={200}
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="input"
              placeholder="Vacation, sick day, family event…"
            />
          </div>
          {blockError ? (
            <p className="text-sm text-red-600">{blockError}</p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-secondary"
              disabled={addingBlock}
            >
              {addingBlock ? "Adding…" : "Add unavailable range"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function formatRangeLocal(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
  const s = fmt.format(new Date(start));
  const e = fmt.format(new Date(end));
  return s === e ? s : `${s} – ${e}`;
}
