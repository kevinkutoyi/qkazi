import { NextResponse } from "next/server";
import { PayoutStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAuth } from "@/lib/api-utils";

/**
 * DELETE /api/payouts/:id — tasker cancels a REQUESTED payout of theirs.
 * (Admin uses the admin endpoint for everything else.)
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;

  const payout = await prisma.payout.findUnique({ where: { id: params.id } });
  if (!payout) return jsonError("Payout not found", 404);
  if (payout.taskerId !== auth.user.sub) return jsonError("Forbidden", 403);
  if (payout.status !== PayoutStatus.REQUESTED) {
    return jsonError(
      "This payout is no longer cancellable — contact support.",
      409,
    );
  }
  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { status: PayoutStatus.CANCELLED },
  });
  return NextResponse.json({ payout: updated });
}
