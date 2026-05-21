import Link from "next/link";
import { redirect } from "next/navigation";
import { PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { getTransactionStatus, isPesapalConfigured } from "@/lib/pesapal";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payment status · Qkazi" };

/**
 * Pesapal redirects the customer here after their checkout flow.
 * Query params Pesapal supplies:
 *   OrderTrackingId, OrderMerchantReference, OrderNotificationType
 *
 * We also set `paymentId` ourselves in the callback URL — that's the
 * primary lookup, with OrderTrackingId as a fallback.
 */
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const pickParam = (k: string): string | undefined => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const paymentId = pickParam("paymentId");
  const orderTrackingId =
    pickParam("OrderTrackingId") ?? pickParam("orderTrackingId");

  let payment = paymentId
    ? await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: { include: { task: true } } },
      })
    : null;
  if (!payment && orderTrackingId) {
    payment = await prisma.payment.findFirst({
      where: { providerPaymentId: orderTrackingId },
      include: { booking: { include: { task: true } } },
    });
  }

  if (!payment) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Payment not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          We couldn&apos;t match this return to one of your payments. If you
          completed a payment, give it a minute and check your dashboard.
        </p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
          Go to dashboard
        </Link>
      </div>
    );
  }

  // Re-sync from Pesapal to get the authoritative status now. The webhook
  // probably already did this, but pulling here makes the success page show
  // the right state even before IPN arrives.
  if (payment.providerPaymentId && isPesapalConfigured()) {
    try {
      const live = await getTransactionStatus(payment.providerPaymentId);
      let next: PaymentStatus | null = null;
      if (live.status_code === 1) next = PaymentStatus.CAPTURED;
      else if (live.status_code === 2) next = PaymentStatus.FAILED;
      else if (live.status_code === 3) next = PaymentStatus.REFUNDED;
      if (next && next !== payment.status) {
        const now = new Date();
        const data: Parameters<typeof prisma.payment.update>[0]["data"] = {
          status: next,
        };
        if (next === PaymentStatus.CAPTURED) data.capturedAt = now;
        if (next === PaymentStatus.REFUNDED) data.refundedAt = now;
        if (next === PaymentStatus.FAILED)
          data.failureReason =
            live.payment_status_description ?? live.message ?? null;
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data,
          include: { booking: { include: { task: true } } },
        });
      }
    } catch (err) {
      console.error("[payments/return] status fetch failed:", err);
      // Fall through and show whatever we have stored.
    }
  }

  const ok =
    payment.status === PaymentStatus.CAPTURED ||
    payment.status === PaymentStatus.RELEASED;
  const failed = payment.status === PaymentStatus.FAILED;

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div
        className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full ${
          ok ? "bg-brand-100" : failed ? "bg-red-100" : "bg-yellow-100"
        } text-3xl`}
      >
        {ok ? "✅" : failed ? "⚠️" : "⏳"}
      </div>
      <h1 className="text-2xl font-bold">
        {ok ? "Payment received" : failed ? "Payment failed" : "Payment pending"}
      </h1>
      <p className="text-sm text-gray-600">
        {ok
          ? `${formatMoney(payment.amountCents, payment.currency)} for "${payment.booking.task.title}" is now held until you mark the task complete.`
          : failed
            ? (payment.failureReason ??
              "Pesapal reported a failure. You can try again from your dashboard.")
            : "We're still waiting on confirmation from Pesapal. Refresh this page in a moment."}
      </p>
      <div className="flex flex-col gap-2">
        <Link
          href={`/tasks/${payment.booking.taskId}`}
          className="btn-primary"
        >
          Back to the task
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
