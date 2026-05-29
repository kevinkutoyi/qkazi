/**
 * Loads the Google Maps JS API exactly once per browser session.
 *
 * Why not @googlemaps/js-api-loader? It's fine, but adds a runtime
 * dependency for ~30 lines of code we can write ourselves. Multiple callers
 * (PlacesAutocomplete, future MapView) can call loadGoogleMaps() concurrently
 * — they all receive the same promise.
 */

declare global {
  interface Window {
    google?: typeof google;
    __qkaziMapsPromise?: Promise<typeof google>;
  }
}

export function getMapsApiKey(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
}

export function loadGoogleMaps(
  libraries: Array<"places" | "geometry" | "marker"> = ["places"],
): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (window.__qkaziMapsPromise) return window.__qkaziMapsPromise;

  const key = getMapsApiKey();
  if (!key) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. See .env.example.",
      ),
    );
  }

  window.__qkaziMapsPromise = new Promise<typeof google>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      libraries: libraries.join(","),
      v: "weekly",
      loading: "async",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = async () => {
      if (!window.google?.maps) {
        reject(new Error("Maps script loaded but window.google missing"));
        return;
      }
      try {
        // With loading=async, the bootstrap script fires onload before the
        // requested libraries (places, geometry, marker) are ready. We must
        // await importLibrary for each one so callers can rely on e.g.
        // google.maps.places.Autocomplete existing.
        await Promise.all(
          libraries.map((lib) =>
            (window.google!.maps as unknown as {
              importLibrary: (name: string) => Promise<unknown>;
            }).importLibrary(lib),
          ),
        );
        resolve(window.google!);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps JS API"));
    document.head.appendChild(script);
  });

  return window.__qkaziMapsPromise;
}

/**
 * URL for a Static Maps image of a single pin. Cheap, no JS required —
 * perfect for the small previews we show on task detail and tasker profile.
 */
export function staticMapUrl(opts: {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
}): string | null {
  const key = getMapsApiKey();
  if (!key) return null;
  const {
    lat,
    lng,
    zoom = 14,
    width = 640,
    height = 240,
  } = opts;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: "2", // retina
    maptype: "roadmap",
    markers: `color:0x16a34a|${lat},${lng}`,
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
