import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import {
  applyDistance,
  buildTaskSearchOrderBy,
  buildTaskSearchWhere,
  parseTaskSearchParams,
} from "@/lib/task-search";

const MAX_IMAGES = 6;

const createTaskSchema = z
  .object({
    title: z.string().min(3).max(120),
    description: z.string().min(10).max(2000),
    location: z.string().min(1).max(120),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    budget: z.number().int().positive(),
    categoryId: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    scheduledFor: z.string().datetime().nullable().optional(),
    imageUrls: z.array(z.string().min(1).max(500)).max(MAX_IMAGES).optional(),
  })
  .refine((d) => Boolean(d.categoryId || d.category), {
    message: "Either categoryId or category (slug) is required",
    path: ["categoryId"],
  })
  .refine(
    (d) =>
      (d.latitude === undefined && d.longitude === undefined) ||
      (d.latitude !== undefined && d.longitude !== undefined),
    { message: "Provide both latitude and longitude, or neither", path: ["latitude"] },
  );

/**
 * GET /api/tasks
 * Filters (all optional): q, category, minBudget, maxBudget, near, from, to,
 * includeFlexible=1, minRating, sort, mine=true, status.
 *
 * When `mine=true` we require auth and override status defaults. Otherwise
 * the shared search helper enforces status=OPEN.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = parseTaskSearchParams(url.searchParams);
  const explicitStatus = url.searchParams.get("status");
  const mine = url.searchParams.get("mine");

  let where = buildTaskSearchWhere(params);

  if (explicitStatus && Object.values(TaskStatus).includes(explicitStatus as TaskStatus)) {
    where = { ...where, status: explicitStatus as TaskStatus };
  }
  if (mine === "true") {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    where = { ...where, customerId: auth.user.sub };
    // Customers viewing their own tasks should see all statuses by default.
    if (!explicitStatus) delete (where as any).status;
  }

  const rawTasks = await prisma.task.findMany({
    where,
    orderBy: buildTaskSearchOrderBy(params.sort ?? "newest"),
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          customerRatingAvg: true,
          customerRatingCount: true,
        },
      },
      category: {
        select: { id: true, slug: true, name: true, emoji: true },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true },
        take: 1,
      },
      _count: { select: { bookings: true } },
    },
  });

  const tasks = applyDistance(rawTasks, params);
  return NextResponse.json({ tasks });
}

/** POST /api/tasks — customers create new task listings */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, createTaskSchema);
  if ("error" in parsed) return parsed.error;
  const {
    title,
    description,
    location,
    budget,
    categoryId,
    category,
    scheduledFor,
    imageUrls,
  } = parsed.data;

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && category) {
    const found = await prisma.category.findUnique({
      where: { slug: category },
      select: { id: true },
    });
    if (!found) return jsonError("Unknown category", 400);
    resolvedCategoryId = found.id;
  }
  if (!resolvedCategoryId) {
    return jsonError("Missing category", 400);
  }

  const { latitude, longitude } = parsed.data;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      location,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      budget,
      customerId: auth.user.sub,
      categoryId: resolvedCategoryId,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      images:
        imageUrls && imageUrls.length > 0
          ? {
              create: imageUrls.map((url, i) => ({
                url,
                sortOrder: i,
              })),
            }
          : undefined,
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ task }, { status: 201 });
}
