import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAuth } from "@/lib/api-utils";

/**
 * DELETE /api/taskers/:id/availability/:blockId
 * Tasker removes one of their own availability blocks. Idempotent.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; blockId: string } },
) {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;
  if (auth.user.sub !== params.id) return jsonError("Forbidden", 403);

  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });
  if (!profile) return jsonError("Tasker profile not found", 404);

  await prisma.availabilityBlock
    .deleteMany({
      where: { id: params.blockId, profileId: profile.id },
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
