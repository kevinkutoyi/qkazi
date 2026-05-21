import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";

const schema = z.object({ taskerId: z.string().min(1) });

/**
 * POST /api/favorites  { taskerId }
 * Customer-only. Idempotent — a duplicate call returns the existing row.
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { taskerId } = parsed.data;

  if (taskerId === auth.user.sub) {
    return jsonError("You can't favorite yourself", 400);
  }

  const tasker = await prisma.user.findFirst({
    where: { id: taskerId, role: Role.TASKER },
    select: { id: true },
  });
  if (!tasker) return jsonError("Tasker not found", 404);

  const favorite = await prisma.favorite.upsert({
    where: { customerId_taskerId: { customerId: auth.user.sub, taskerId } },
    update: {},
    create: { customerId: auth.user.sub, taskerId },
  });
  return NextResponse.json({ favorite }, { status: 201 });
}

/**
 * GET /api/favorites
 * Returns the current customer's favorites, with the tasker profile included.
 */
export async function GET() {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  const favorites = await prisma.favorite.findMany({
    where: { customerId: auth.user.sub },
    orderBy: { createdAt: "desc" },
    include: {
      tasker: {
        select: {
          id: true,
          name: true,
          taskerProfile: {
            select: {
              photoUrl: true,
              hourlyRate: true,
              location: true,
              skills: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  });
  return NextResponse.json({ favorites });
}
