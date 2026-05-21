"use client";

import { useState } from "react";

/**
 * Asks the browser for the user's current coordinates and reports them
 * upward. Errors are surfaced in-line; the parent can choose to disable
 * downstream UI (e.g. the radius select) when no coords are available.
 */
export default function UseMyLocationButton({
  onLocated,
  label = "Use my location",
  className,
}: {
  onLocated: (coords: { latitude: number; longitude: number }) => void;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function request() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser doesn't support geolocation.");
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onLocated({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Allow it in your browser settings to use distance search."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Couldn't determine your location."
              : "Location request timed out. Try again.",
        );
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={request}
        className="btn-secondary w-full"
        disabled={busy}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {busy ? "Getting your location…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
