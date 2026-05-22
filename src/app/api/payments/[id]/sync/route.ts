import { NextResponse } from "next/server";
import {
  BookingStatus,
  NotificationType,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-utils";
import { getTransactionStatus, isPesapalConfigured } from "@/lib/pesapal";
import { notify } from "@/lib/notifications";
import { formatMoney } from "@/lib/money";

/**
 * POST /api/payments/:id/sync
 *
 * Pulls the authoritative status from Pesapal and updates our Payment row.
 * Called by the return page (after the customer redirects back) and by the
 * webhook handler. Idempotent.
 *
 * On success it also auto-promotes the booking — once we have CAPTURED
 * funds the task remains ASSIGNED until the customer marks complete; when
 * the booking goes COMPLETED the payment is RELEASED (handled in the
 * bookings PATCH).
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { booking: true },
  });
  if (!payment) return jsonError("Payment not found", 404);
  if (!payment.providerPaymentId) {
    return jsonError("Payment hasn't been started with Pesapal yet", 409);
  }
  if (!isPesapalConfigured()) {
    return jsonError("Pesapal not configured", 503);
  }

  let status;
  try {
    status = await getTransactionStatus(payment.providerPaymentId);
  } catch (err) {
    console.error("[pesapal] status check failed:", err);
    return jsonError("Could not reach Pesapal", 502);
  }

  let next: PaymentStatus | null = null;
  let failureReason: string | null = null;
  // Pesapal status_code: 0 invalid, 1 completed, 2 failed, 3 reversed.
  switch (status.status_code) {
    case 1:
      next = PaymentStatus.CAPTURED;
      break;
    case 2:
      next = PaymentStatus.FAILED;
      failureReason =
        status.payment_status_description ?? status.message ?? null;
      break;
    case 3:
      next = PaymentStatus.REFUNDED;
      break;
    default:
      // Still pending — leave as is.
      break;
  }

  if (next && next !== payment.status) {
    const data: Parameters<typeof prisma.payment.update>[0]["data"] = {
      status: next,
      failureReason,
    };
    const now = new Date();
    if (next === PaymentStatus.CAPTURED) data.capturedAt = now;
    if (next === PaymentStatus.REFUNDED) data.refundedAt = now;
    await prisma.payment.update({ where: { id: payment.id }, data });

    // Ping the tasker when funds capture or release.
    let finalStatus: PaymentStatus = next;
    if (
      next === PaymentStatus.CAPTURED &&
      payment.booking.status === BookingStatus.COMPLETED
    ) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.RELEASED, releasedAt: new Date() },
      });
      finalStatus = PaymentStatus.RELEASED;
    }

    if (finalStatus === PaymentStatus.CAPTURED) {
      notify({
        userId: payment.booking.taskerId,
        type: NotificationType.PAYMENT_AUTHORIZED,
        title: "Payment received",
        body: `${formatMoney(payment.amountCents, payment.currency)} is in escrow until the task completes.`,
        url: "/wallet",
        data: { paymentId: payment.id, bookingId: payment.bookingId },
      });
    } else if (finalStatus === PaymentStatus.RELEASED) {
      notify({
        userId: payment.booking.taskerId,
        type: NotificationType.PAYMENT_RELEASED,
        title: "Funds released",
        body: `${formatMoney(payment.amountCents, payment.currency)} is now in your wallet.`,
        url: "/wallet",
        data: { paymentId: payment.id, bookingId: payment.bookingId },
      });
    }
  }

  const updated = await prisma.payment.findUnique({
    where: { id: payment.id },
  });
  return NextResponse.json({ payment: updated, providerStatus: status });
}

export const dynamic = "force-dynamic";
