import { staticMapUrl } from "@/lib/maps";

/**
 * Server component (no "use client"). Renders a tiny static map showing a
 * single pin at the given coordinates. If the API key isn't set, falls back
 * to a graceful placeholder.
 */
export default function MapPreview({
  lat,
  lng,
  label,
  height = 200,
}: {
  lat: number | null;
  lng: number | null;
  label?: string;
  height?: number;
}) {
  if (lat == null || lng == null) return null;
  const url = staticMapUrl({ lat, lng, height });
  return (
    <div
      className="overflow-hidden rounded-md ring-1 ring-inset ring-gray-200"
      style={{ height }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label ? `Map showing ${label}` : "Location map"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-50 px-4 text-center text-xs text-gray-500">
          Map preview unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to
          enable.
        </div>
      )}
    </div>
  );
}
