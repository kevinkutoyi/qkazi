import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { DEFAULT_CURRENCY, decimalToCents } from "@/lib/money";
import { isPesapalConfigured, submitOrder } from "@/lib/pesapal";

const schema = z.object({ bookingId: z.string().min(1) });

/**
 * POST /api/payments/start  { bookingId }
 *
 * Customer kicks off (or resumes) the Pesapal checkout for an accepted
 * booking. We create the Payment row on first call, then call Pesapal
 * SubmitOrderRequest and write back the order_tracking_id.
 *
 * Response: { paymentId, redirectUrl }
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  if (!isPesapalConfigured()) {
    return jsonError(
      "Pesapal isn't configured on this server. Ask the admin to set PESAPAL_CONSUMER_KEY/SECRET.",
      503,
    );
  }

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: {
      task: { select: { id: true, title: true, customerId: true, budget: true } },
      payment: true,
      tasker: { select: { id: true, name: true } },
    },
  });
  if (!booking) return jsonError("Booking not found", 404);
  if (booking.task.customerId !== auth.user.sub) {
    return jsonError("Forbidden", 403);
  }
  if (booking.status !== BookingStatus.ACCEPTED) {
    return jsonError("This booking isn't ready for payment yet.", 409);
  }
  if (
    booking.payment &&
    (booking.payment.status === PaymentStatus.CAPTURED ||
      booking.payment.status === PaymentStatus.RELEASED)
  ) {
    return jsonError("This booking has already been paid.", 409);
  }

  // Amount: prefer the tasker's accepted bid, fall back to the task budget.
  // Task budget is stored as whole currency units, so * 100 for cents.
  const amountCents =
    booking.priceCents != null && booking.priceCents > 0
      ? booking.priceCents
      : decimalToCents(booking.task.budget);

  // Upsert the Payment row.
  const customer = await prisma.user.findUnique({
    where: { id: auth.user.sub },
    select: { name: true, email: true },
  });

  const payment = booking.payment
    ? await prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          amountCents,
          currency: DEFAULT_CURRENCY,
          provider: PaymentProvider.PESAPAL,
          status: PaymentStatus.PENDING,
          failureReason: null,
        },
      })
    : await prisma.payment.create({
        data: {
          bookingId: booking.id,
          customerId: auth.user.sub,
          amountCents,
          currency: DEFAULT_CURRENCY,
          provider: PaymentProvider.PESAPAL,
          status: PaymentStatus.PENDING,
        },
      });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const callbackUrl = `${appUrl}/payments/return?paymentId=${payment.id}`;

  // Build a friendly billing block. Pesapal rejects empty last_name on some
  // edge paths, so fall back to "Customer" when the user only has one name.
  const nameParts = (customer?.name ?? "").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "Customer";
  const lastName = nameParts.slice(1).join(" ") || ".";

  // Use a per-attempt merchant reference so a Pesapal retry doesn't collide
  // with the previous attempt's reference. The order_tracking_id stored on
  // providerPaymentId remains our authoritative pointer for status sync.
  const merchantReference = `${payment.id}-${Date.now()}`;

  let pesapalRes;
  try {
    pesapalRes = await submitOrder({
      merchantReference,
      amountCents,
      currency: payment.currency,
      description: `Qkazi · ${booking.task.title}`.slice(0, 100),
      callbackUrl,
      billing: {
        email_address: customer?.email,
        first_name: firstName,
        last_name: lastName,
        country_code: "KE",
      },
    });
  } catch (err) {
    console.error("[pesapal] submitOrder failed:", err);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: err instanceof Error ? err.message : "Pesapal error",
      },
    });
    return jsonError("Couldn't start payment. Try again in a moment.", 502);
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: pesapalRes.order_tracking_id },
  });

  return NextResponse.json({
    paymentId: payment.id,
    redirectUrl: pesapalRes.redirect_url,
    orderTrackingId: pesapalRes.order_tracking_id,
  });
}
