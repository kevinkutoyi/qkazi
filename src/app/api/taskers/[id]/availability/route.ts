import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { parseDayUtc } from "@/lib/availability";

const createBlockSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().max(200).optional(),
  })
  .refine((d) => parseDayUtc(d.startDate) !== null, {
    message: "Invalid startDate",
    path: ["startDate"],
  })
  .refine((d) => parseDayUtc(d.endDate) !== null, {
    message: "Invalid endDate",
    path: ["endDate"],
  });

/**
 * POST /api/taskers/:id/availability  { startDate, endDate, reason? }
 * Creates an unavailable-dates block on the tasker's own profile.
 * Range is inclusive; startDate must be ≤ endDate.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;
  if (auth.user.sub !== params.id) return jsonError("Forbidden", 403);

  const parsed = await parseBody(req, createBlockSchema);
  if ("error" in parsed) return parsed.error;
  const { startDate, endDate, reason } = parsed.data;
  const start = parseDayUtc(startDate)!;
  const end = parseDayUtc(endDate)!;

  if (start.getTime() > end.getTime()) {
    return jsonError("startDate must be on or before endDate", 400);
  }

  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });
  if (!profile) return jsonError("Tasker profile not found", 404);

  const block = await prisma.availabilityBlock.create({
    data: {
      profileId: profile.id,
      startDate: start,
      endDate: end,
      reason: reason ?? null,
    },
  });
  return NextResponse.json({ block }, { status: 201 });
}

/**
 * GET /api/taskers/:id/availability
 * Public — anyone can see when a tasker is unavailable.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });
  if (!profile) return jsonError("Tasker profile not found", 404);

  const blocks = await prisma.availabilityBlock.findMany({
    where: { profileId: profile.id },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      reason: true,
    },
  });
  return NextResponse.json({ blocks });
}
