import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

/**
 * DELETE /api/favorites/:taskerId
 * Customer-only. Idempotent — succeeds whether or not the row exists.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { taskerId: string } },
) {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  await prisma.favorite
    .delete({
      where: {
        customerId_taskerId: {
          customerId: auth.user.sub,
          taskerId: params.taskerId,
        },
      },
    })
    .catch(() => undefined); // P2025 = not found, fine.

  return NextResponse.json({ ok: true });
}
