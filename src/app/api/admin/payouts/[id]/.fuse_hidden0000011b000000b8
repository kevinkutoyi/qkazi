import { NextResponse } from "next/server";
import { z } from "zod";
import { PayoutStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";

const schema = z.object({
  action: z.enum(["MARK_PROCESSING", "MARK_PAID", "MARK_FAILED", "CANCEL"]),
  reference: z.string().max(200).optional(),
  failureReason: z.string().max(500).optional(),
});

/**
 * POST /api/admin/payouts/:id — admin moves a payout through its lifecycle.
 * Allowed transitions:
 *   REQUESTED → PROCESSING | PAID | CANCELLED
 *   PROCESSING → PAID | FAILED | CANCELLED
 *
 * If/when Pesapal disbursements are enabled, this is where you'd plug the
 * automated submit (see `submitDisbursement` in src/lib/pesapal.ts) before
 * setting PROCESSING.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { action, reference, failureReason } = parsed.data;

  const payout = await prisma.payout.findUnique({ where: { id: params.id } });
  if (!payout) return jsonError("Payout not found", 404);

  const allowedFrom: Record<typeof action, PayoutStatus[]> = {
    MARK_PROCESSING: [PayoutStatus.REQUESTED],
    MARK_PAID: [PayoutStatus.REQUESTED, PayoutStatus.PROCESSING],
    MARK_FAILED: [PayoutStatus.REQUESTED, PayoutStatus.PROCESSING],
    CANCEL: [PayoutStatus.REQUESTED, PayoutStatus.PROCESSING],
  };
  if (!allowedFrom[action].includes(payout.status)) {
    return jsonError(
      `Can't ${action} from status ${payout.status}.`,
      409,
    );
  }

  const data: Parameters<typeof prisma.payout.update>[0]["data"] = {
    processedById: auth.user.sub,
  };
  const now = new Date();
  switch (action) {
    case "MARK_PROCESSING":
      data.status = PayoutStatus.PROCESSING;
      break;
    case "MARK_PAID":
      data.status = PayoutStatus.PAID;
      data.processedAt = now;
      if (reference) data.reference = reference;
      break;
    case "MARK_FAILED":
      data.status = PayoutStatus.FAILED;
      data.processedAt = now;
      if (failureReason) data.failureReason = failureReason;
      break;
    case "CANCEL":
      data.status = PayoutStatus.CANCELLED;
      data.processedAt = now;
      break;
  }

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data,
  });
  return NextResponse.json({ payout: updated });
}
