import { NextResponse } from "next/server";
import { PayoutStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

/**
 * GET /api/admin/payouts?status=REQUESTED — list payouts in any status.
 * Defaults to REQUESTED so the admin queue is the natural landing list.
 */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = (searchParams.get("status") ?? "REQUESTED").toUpperCase();
  const status = (Object.values(PayoutStatus) as string[]).includes(statusParam)
    ? (statusParam as PayoutStatus)
    : PayoutStatus.REQUESTED;

  const payouts = await prisma.payout.findMany({
    where: { status },
    orderBy: { requestedAt: "asc" },
    include: {
      tasker: {
        select: {
          id: true,
          name: true,
          email: true,
          taskerProfile: { select: { photoUrl: true, location: true } },
        },
      },
    },
  });
  return NextResponse.json({ payouts });
}
