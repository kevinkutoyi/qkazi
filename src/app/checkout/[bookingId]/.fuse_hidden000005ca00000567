import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingStatus, PaymentStatus, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney, decimalToCents, DEFAULT_CURRENCY } from "@/lib/money";
import { isPesapalConfigured } from "@/lib/pesapal";
import CheckoutButton from "./CheckoutButton";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      task: {
        select: { id: true, title: true, customerId: true, budget: true },
      },
      tasker: { select: { id: true, name: true } },
      payment: true,
    },
  });
  if (!booking) notFound();
  if (booking.task.customerId !== current.sub) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Forbidden</h1>
        <p className="mt-2 text-sm text-gray-600">
          Only the customer who posted this task can check out.
        </p>
      </div>
    );
  }

  const alreadyPaid =
    booking.payment &&
    (booking.payment.status === PaymentStatus.CAPTURED ||
      booking.payment.status === PaymentStatus.RELEASED);

  const notReady = booking.status !== BookingStatus.ACCEPTED && !alreadyPaid;

  const amountCents =
    booking.priceCents != null && booking.priceCents > 0
      ? booking.priceCents
      : decimalToCents(booking.task.budget);
  const currency = booking.payment?.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href={`/tasks/${booking.task.id}`}
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to task
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pay securely via Pesapal — cards, M-Pesa, and bank options on the
          next screen.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Order summary</h2>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
          <dt className="text-gray-600">Task</dt>
          <dd className="text-right font-medium">{booking.task.title}</dd>
          <dt className="text-gray-600">Tasker</dt>
          <dd className="text-right">{booking.tasker.name}</dd>
          <dt className="text-gray-600">Amount</dt>
          <dd className="text-right font-semibold text-gray-900">
            {formatMoney(amountCents, currency)}
          </dd>
        </dl>
        <p className="mt-4 text-xs text-gray-500">
          Funds are held until you mark the task complete. Then they&apos;re
          released to the tasker.
        </p>
      </section>

      {alreadyPaid ? (
        <div className="card border-brand-100 bg-brand-50 p-5 text-sm text-brand-900">
          ✅ This booking has already been paid. Mark the task complete from
          its page when the work is done.
          <div className="mt-3">
            <Link
              href={`/tasks/${booking.task.id}`}
              className="text-brand-700 hover:underline"
            >
              Back to task →
            </Link>
          </div>
        </div>
      ) : notReady ? (
        <div className="card border-yellow-100 bg-yellow-50 p-5 text-sm text-yellow-900">
          The tasker hasn&apos;t accepted this offer yet — you&apos;ll be able
          to pay once it&apos;s accepted.
        </div>
      ) : !isPesapalConfigured() ? (
        <div className="card border-red-100 bg-red-50 p-5 text-sm text-red-900">
          Payments aren&apos;t configured on this server. Please contact
          support.
        </div>
      ) : (
        <CheckoutButton bookingId={booking.id} />
      )}
    </div>
  );
}
