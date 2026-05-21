import { PaymentStatus, PayoutStatus } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * A tasker's available payout balance, in cents:
 *
 *   sum(payments.amountCents) where status = RELEASED and booking.taskerId = me
 * minus
 *   sum(payouts.amountCents) where status in (REQUESTED, PROCESSING, PAID)
 *
 * REQUESTED / PROCESSING are subtracted so a tasker can't request twice; if
 * the admin cancels the payout the balance frees up again.
 */
export async function computeTaskerBalance(
  taskerId: string,
): Promise<{ earnedCents: number; pendingPayoutCents: number; availableCents: number }> {
  const [earned, pending] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: {
        status: PaymentStatus.RELEASED,
        booking: { taskerId },
      },
    }),
    prisma.payout.aggregate({
      _sum: { amountCents: true },
      where: {
        taskerId,
        status: {
          in: [PayoutStatus.REQUESTED, PayoutStatus.PROCESSING, PayoutStatus.PAID],
        },
      },
    }),
  ]);
  const earnedCents = earned._sum.amountCents ?? 0;
  const pendingPayoutCents = pending._sum.amountCents ?? 0;
  return {
    earnedCents,
    pendingPayoutCents,
    availableCents: Math.max(0, earnedCents - pendingPayoutCents),
  };
}
