import { NextResponse } from "next/server";
import { PaymentStatus, BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTransactionStatus, isPesapalConfigured } from "@/lib/pesapal";

/**
 * Pesapal IPN handler.
 *
 * Pesapal calls this URL with query params:
 *   OrderTrackingId        — the order_tracking_id we received
 *   OrderNotificationType  — IPNCHANGE (or others)
 *   OrderMerchantReference — our payment id
 *
 * The webhook payload itself doesn't include the new status — we have to
 * call GetTransactionStatus to verify. That double-call is also our
 * security model: a forged webhook just causes an extra API hit; we never
 * trust the inbound payload.
 *
 * Always returns 200 quickly so Pesapal doesn't keep retrying us; the
 * actual processing happens before the response.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const orderTrackingId =
    url.searchParams.get("OrderTrackingId") ??
    url.searchParams.get("orderTrackingId");
  const merchantReference =
    url.searchParams.get("OrderMerchantReference") ??
    url.searchParams.get("orderMerchantReference");

  if (!orderTrackingId) {
    return NextResponse.json({ ok: false, error: "missing OrderTrackingId" });
  }

  if (!isPesapalConfigured()) {
    console.warn("[webhook/pesapal] received but Pesapal not configured");
    return NextResponse.json({ ok: true });
  }

  // Look up payment by tracking id; fall back to the payment-id prefix of
  // the merchant reference (we use `${paymentId}-${attemptTs}` on submit).
  const fallbackId = merchantReference?.split("-").slice(0, -1).join("-");
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerPaymentId: orderTrackingId },
        fallbackId ? { id: fallbackId } : { id: "__none__" },
      ],
    },
    include: { booking: true },
  });
  if (!payment) {
    console.warn(
      `[webhook/pesapal] no payment found for tracking id ${orderTrackingId}`,
    );
    return NextResponse.json({ ok: true });
  }

  let status;
  try {
    status = await getTransactionStatus(orderTrackingId);
  } catch (err) {
    console.error("[webhook/pesapal] status fetch failed:", err);
    return NextResponse.json({ ok: true });
  }

  let next: PaymentStatus | null = null;
  let failureReason: string | null = null;
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
  }

  if (next && next !== payment.status) {
    const now = new Date();
    const data: Parameters<typeof prisma.payment.update>[0]["data"] = {
      status: next,
      failureReason,
    };
    if (next === PaymentStatus.CAPTURED) data.capturedAt = now;
    if (next === PaymentStatus.REFUNDED) data.refundedAt = now;
    await prisma.payment.update({ where: { id: payment.id }, data });

    if (
      next === PaymentStatus.CAPTURED &&
      payment.booking.status === BookingStatus.COMPLETED
    ) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.RELEASED, releasedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

// Pesapal sends a POST by default (since we registered with POST), but it
// also accepts GET. Handle both.
export const POST = handle;
export const GET = handle;
export const dynamic = "force-dynamic";
