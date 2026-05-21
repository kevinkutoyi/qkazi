import { Prisma, TaskStatus } from "@prisma/client";
import { bboxAround, haversineKm, isValidLatLng } from "./geo";

/** Allowed `sort` values surfaced in the UI + API. */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "soonest", label: "Soonest available" },
  { value: "distance", label: "Distance" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export interface TaskSearchParams {
  q?: string;
  category?: string;
  minBudget?: number;
  maxBudget?: number;
  near?: string;
  from?: string;
  to?: string;
  includeFlexible?: boolean;
  minRating?: number;
  // Geo: lat + lng must be provided together. radiusKm is only honored when
  // both lat and lng are present.
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: SortKey;
}

function toInt(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function toFloat(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseTaskSearchParams(
  raw: Record<string, string | string[] | undefined> | URLSearchParams,
): TaskSearchParams {
  const get = (k: string): string | undefined => {
    if (raw instanceof URLSearchParams) return raw.get(k) ?? undefined;
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sort = get("sort");
  const lat = toFloat(get("lat"));
  const lng = toFloat(get("lng"));
  const radiusKm = toFloat(get("radiusKm"));

  // Treat lat/lng as a pair: ignore both if either is missing/invalid.
  const hasCoords = isValidLatLng(lat, lng) && lat !== undefined && lng !== undefined;

  return {
    q: get("q")?.trim() || undefined,
    category: get("category")?.trim() || undefined,
    minBudget: toInt(get("minBudget")),
    maxBudget: toInt(get("maxBudget")),
    near: get("near")?.trim() || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    includeFlexible: get("includeFlexible") === "1",
    minRating: toFloat(get("minRating")),
    lat: hasCoords ? lat : undefined,
    lng: hasCoords ? lng : undefined,
    radiusKm: hasCoords && radiusKm !== undefined ? radiusKm : undefined,
    sort: SORT_OPTIONS.some((o) => o.value === sort)
      ? (sort as SortKey)
      : "newest",
  };
}

export function buildTaskSearchWhere(
  params: TaskSearchParams,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { status: TaskStatus.OPEN };

  if (params.category) where.category = { slug: params.category };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.minBudget !== undefined || params.maxBudget !== undefined) {
    where.budget = {
      ...(params.minBudget !== undefined ? { gte: params.minBudget } : {}),
      ...(params.maxBudget !== undefined ? { lte: params.maxBudget } : {}),
    };
  }

  if (params.near) {
    where.location = { contains: params.near, mode: "insensitive" };
  }

  const fromDate = params.from ? new Date(`${params.from}T00:00:00.000Z`) : null;
  const toDate = params.to ? new Date(`${params.to}T23:59:59.999Z`) : null;
  if (fromDate || toDate) {
    const scheduledRange: Prisma.DateTimeFilter = {};
    if (fromDate && !Number.isNaN(fromDate.getTime()))
      scheduledRange.gte = fromDate;
    if (toDate && !Number.isNaN(toDate.getTime())) scheduledRange.lte = toDate;
    if (params.includeFlexible) {
      where.OR = [
        ...(where.OR ?? []),
        { scheduledFor: scheduledRange },
        { scheduledFor: null },
      ];
    } else {
      where.scheduledFor = scheduledRange;
    }
  }

  if (params.minRating !== undefined && params.minRating > 0) {
    where.customer = { customerRatingAvg: { gte: params.minRating } };
  }

  // Bounding-box filter for distance search. We refine to the exact radius
  // in JavaScript after the query (see `applyDistance`). The bbox lets the
  // DB do the heavy lifting using the @@index([latitude, longitude]) index.
  if (params.lat !== undefined && params.lng !== undefined) {
    const radius = params.radiusKm ?? 50; // sensible default
    const box = bboxAround(params.lat, params.lng, radius);
    where.latitude = { gte: box.minLat, lte: box.maxLat };
    where.longitude = { gte: box.minLng, lte: box.maxLng };
  }

  return where;
}

export function buildTaskSearchOrderBy(
  sort: SortKey,
): Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ budget: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ budget: "desc" }, { createdAt: "desc" }];
    case "soonest":
      return [
        { scheduledFor: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ];
    case "distance":
      // The DB can't sort by Haversine; fall back to newest at the DB and
      // re-sort by distance after `applyDistance`.
      return { createdAt: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export type WithDistance<T> = T & { distanceKm: number | null };

/**
 * Decorate each task with `distanceKm`, then optionally filter to within
 * `radiusKm` and re-sort by distance. Pure function — call after Prisma
 * returns the bbox-filtered candidates.
 */
export function applyDistance<
  T extends { latitude: number | null; longitude: number | null },
>(
  tasks: T[],
  params: TaskSearchParams,
): WithDistance<T>[] {
  if (params.lat === undefined || params.lng === undefined) {
    return tasks.map((t) => ({ ...t, distanceKm: null }));
  }
  const decorated: WithDistance<T>[] = tasks.map((t) => ({
    ...t,
    distanceKm:
      t.latitude != null && t.longitude != null
        ? haversineKm(params.lat!, params.lng!, t.latitude, t.longitude)
        : null,
  }));

  let filtered = decorated;
  if (params.radiusKm !== undefined) {
    filtered = decorated.filter(
      (t) => t.distanceKm != null && t.distanceKm <= params.radiusKm!,
    );
  }

  if (params.sort === "distance") {
    filtered = [...filtered].sort(
      (a, b) =>
        (a.distanceKm ?? Number.POSITIVE_INFINITY) -
        (b.distanceKm ?? Number.POSITIVE_INFINITY),
    );
  }
  return filtered;
}
