"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";

export interface PlaceSelection {
  formatted: string;
  latitude: number;
  longitude: number;
}

/**
 * Wraps Google Places Autocomplete on top of a regular text input. The user
 * sees an Autocomplete dropdown; when they pick a result we hand the parent
 * back the formatted address plus geocoded lat/lng.
 *
 * Notes:
 *   * Uses the legacy `google.maps.places.Autocomplete` widget. The newer
 *     `PlaceAutocompleteElement` is recommended for new projects but is more
 *     ceremony for the same UX; we'll migrate when it stabilizes.
 *   * The input remains a regular form input — its `value` is sent with the
 *     surrounding form on submit (we don't depend on JS for round-tripping
 *     the text).
 *   * Without an API key configured, the component degrades to a plain text
 *     input with a helpful note.
 */
export default function PlacesAutocomplete({
  id,
  name,
  required,
  initialValue,
  initialLat,
  initialLng,
  placeholder,
  onSelect,
}: {
  id?: string;
  name?: string;
  required?: boolean;
  initialValue?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  placeholder?: string;
  onSelect: (place: PlaceSelection | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState(initialValue ?? "");
  const [warning, setWarning] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Notify parent of any pre-existing coords so the form has them.
  useEffect(() => {
    if (initialLat != null && initialLng != null && initialValue) {
      onSelect({
        formatted: initialValue,
        latitude: initialLat,
        longitude: initialLng,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let detach: (() => void) | undefined;
    let cancelled = false;

    loadGoogleMaps(["places"])
      .then((g) => {
        if (cancelled || !inputRef.current) return;
        const ac = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
        });
        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted =
            place.formatted_address ?? place.name ?? inputRef.current?.value ?? "";
          const loc = place.geometry?.location;
          if (loc) {
            const lat = loc.lat();
            const lng = loc.lng();
            setText(formatted);
            // The Autocomplete widget already updates the input value, but
            // we set state so the surrounding controlled UI stays in sync.
            onSelect({ formatted, latitude: lat, longitude: lng });
          } else {
            // User picked something with no geometry — clear coords.
            onSelect(null);
          }
        });
        setReady(true);
        detach = () => {
          listener.remove();
          // The legacy widget leaves a .pac-container in the DOM; we leave
          // it alone since it's reused if another autocomplete mounts.
        };
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setWarning(err.message);
      });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [onSelect]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    // The user typed manually — invalidate any previously selected coords.
    onSelect(null);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        required={required}
        className="input"
        value={text}
        onChange={handleChange}
        placeholder={placeholder ?? "Start typing an address…"}
        autoComplete="off"
        aria-busy={!ready && !warning}
      />
      {warning ? (
        <p className="mt-1 text-xs text-yellow-700">
          Address suggestions unavailable: {warning}
        </p>
      ) : null}
    </div>
  );
}
