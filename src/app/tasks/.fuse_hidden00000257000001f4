"use client";

import { useState } from "react";
import UseMyLocationButton from "@/components/UseMyLocationButton";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

/**
 * Client-side controls for the distance filter section of the search
 * sidebar. State for lat/lng/radiusKm is held locally and emitted as
 * hidden inputs so the surrounding <form method="GET"> picks them up on
 * submit — keeping the rest of the search server-rendered and URL-driven.
 *
 * Once the customer grants geolocation, the section unlocks the radius
 * select. If they decline (or the browser doesn't support it), the section
 * stays locked and surfaces the browser's permission message.
 */
export default function DistanceFilter({
  initialLat,
  initialLng,
  initialRadius,
}: {
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat !== undefined && initialLng !== undefined
      ? { lat: initialLat, lng: initialLng }
      : null,
  );
  const [radius, setRadius] = useState<number>(initialRadius ?? 10);

  if (!coords) {
    return (
      <fieldset>
        <legend className="label">Distance</legend>
        <UseMyLocationButton
          onLocated={(c) => setCoords({ lat: c.latitude, lng: c.longitude })}
        />
        <p className="mt-2 text-xs text-gray-500">
          Distance search needs your location. We don&apos;t store it — it
          only travels in the URL while you browse.
        </p>
      </fieldset>
    );
  }

  return (
    <fieldset>
      <legend className="label">Distance</legend>
      <div className="rounded-md border border-brand-100 bg-brand-50 p-3">
        <p className="flex items-center gap-2 text-xs font-medium text-brand-900">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-600" />
          Using your location
        </p>
        <p className="mt-0.5 truncate text-[11px] text-brand-900/70">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      </div>

      <label className="label mt-3" htmlFor="radiusKm">
        Within
      </label>
      <select
        id="radiusKm"
        name="radiusKm"
        value={radius}
        onChange={(e) => setRadius(Number(e.target.value))}
        className="input"
      >
        {RADIUS_OPTIONS.map((km) => (
          <option key={km} value={km}>
            {km} km
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setCoords(null)}
        className="mt-2 text-xs text-brand-700 hover:underline"
      >
        Clear location
      </button>

      <input type="hidden" name="lat" value={coords.lat} />
      <input type="hidden" name="lng" value={coords.lng} />
    </fieldset>
  );
}
