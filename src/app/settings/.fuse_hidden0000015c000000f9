"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TIMEZONES, zoneLabel } from "@/lib/datetime";

export default function TimezoneSettingsForm({
  current,
}: {
  current: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(current ?? "");
  const [browserGuess, setBrowserGuess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setBrowserGuess(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // ignore
    }
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Build the option list so the user's current zone always appears even if
  // it isn't in our curated list.
  const options = (() => {
    const map = new Map(TIMEZONES.map((t) => [t.value, t.label]));
    if (value && !map.has(value)) map.set(value, zoneLabel(value));
    if (browserGuess && !map.has(browserGuess)) {
      map.set(browserGuess, `${zoneLabel(browserGuess)} (your browser)`);
    }
    return Array.from(map.entries()).map(([v, l]) => ({ value: v, label: l }));
  })();

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor="tz">
          Timezone
        </label>
        <select
          id="tz"
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {!value ? (
            <option value="" disabled>
              Pick a timezone…
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {browserGuess && browserGuess !== value ? (
          <button
            type="button"
            onClick={() => setValue(browserGuess)}
            className="mt-2 text-xs text-brand-700 hover:underline"
          >
            Use my browser&apos;s timezone ({browserGuess})
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {savedAt ? (
        <p className="text-xs text-brand-700">Saved.</p>
      ) : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={saving || !value || value === current}
      >
        {saving ? "Saving…" : "Save timezone"}
      </button>
    </form>
  );
}
