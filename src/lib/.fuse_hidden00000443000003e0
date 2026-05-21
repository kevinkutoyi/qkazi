/**
 * Geographic helpers — pure functions, no Node/DB deps.
 *
 * Distance is computed with the Haversine formula, which treats the Earth as
 * a sphere. That's accurate to within ~0.5 % for the kinds of distances we
 * care about (city / metro area), and works on plain Postgres without any
 * spatial extension. If you need sub-meter accuracy later, swap to PostGIS.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Approximate lat/lng bounding box that contains every point within
 * `radiusKm` of (lat, lng). 1° latitude is ~111 km everywhere; 1° longitude
 * shrinks toward the poles, so we scale by cos(latitude).
 *
 * The box overshoots slightly near the poles and across the antimeridian —
 * fine for our use case. Callers should refine with `haversineKm` for the
 * exact radius check.
 */
export function bboxAround(
  lat: number,
  lng: number,
  radiusKm: number,
): BoundingBox {
  const latDelta = radiusKm / 111;
  const cosLat = Math.cos(toRad(lat));
  // Clamp cosLat to avoid divide-by-zero exactly at the poles.
  const lngDelta = radiusKm / (111 * Math.max(0.01, cosLat));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
