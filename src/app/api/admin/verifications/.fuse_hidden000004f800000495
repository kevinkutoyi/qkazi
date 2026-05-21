import { NextResponse } from "next/server";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

/**
 * GET /api/admin/verifications?status=PENDING|APPROVED|REJECTED
 * Admin only. Lists tasker profiles by review status.
 */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") ?? "PENDING";
  const status = (Object.values(VerificationStatus) as string[]).includes(
    statusParam,
  )
    ? (statusParam as VerificationStatus)
    : VerificationStatus.PENDING;

  const profiles = await prisma.taskerProfile.findMany({
    where: { verificationStatus: status },
    orderBy: { verificationSubmittedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });
  return NextResponse.json({ profiles });
}
