import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookingStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWalletState, type WalletTransaction } from "@/lib/wallet";
import { formatMoney } from "@/lib/money";
import PayoutRequestForm from "../payouts/PayoutRequestForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wallet · Qkazi" };

export default async function WalletPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== Role.TASKER) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">For taskers only</h1>
        <p className="mt-2 text-sm text-gray-600">
          The wallet is for tasker accounts.
        </p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const [wallet, profile, escrow] = await Promise.all([
    getWalletState(current.sub),
    prisma.taskerProfile.findUnique({
      where: { userId: current.sub },
      select: {
        payoutMethod: true,
        payoutDestination: true,
        payoutDestinationName: true,
      },
    }),
    // Pending payments are CAPTURED but not yet RELEASED — usually because
    // the customer hasn't marked the task complete yet. We surface these in
    // their own panel so taskers can chase them.
    prisma.payment.findMany({
      where: {
        booking: { taskerId: current.sub },
        status: PaymentStatus.CAPTURED,
      },
      orderBy: { capturedAt: "desc" },
      include: {
        booking: {
          include: {
            task: { select: { id: true, title: true } },
            tasker: { select: { id: true, name: true } },
          },
        },
      },
      take: 10,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-sm text-gray-600">
          Your earnings, pending payments, and withdrawal history.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Available"
          value={formatMoney(wallet.stats.availableCents, wallet.currency)}
          tone="brand"
          sub="Ready to withdraw"
        />
        <StatCard
          label="Lifetime earned"
          value={formatMoney(wallet.stats.earnedCents, wallet.currency)}
          tone="gray"
        />
        <StatCard
          label="In escrow"
          value={formatMoney(wallet.stats.inEscrowCents, wallet.currency)}
          tone={wallet.stats.inEscrowCents > 0 ? "yellow" : "gray"}
          sub="Awaiting task completion"
        />
        <StatCard
          label="Withdrawn"
          value={formatMoney(wallet.stats.withdrawnCents, wallet.currency)}
          tone="gray"
          sub={
            wallet.stats.pendingWithdrawalCents > 0
              ? `${formatMoney(wallet.stats.pendingWithdrawalCents, wallet.currency)} pending`
              : undefined
          }
        />
      </section>

      {/* Withdrawal request */}
      <section className="card p-6">
        <h2 className="text-base font-semibold">Request a withdrawal</h2>
        {wallet.stats.availableCents === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have any available funds yet. Once a customer
            marks a paid task complete, the money lands here.
          </p>
        ) : (
          <PayoutRequestForm
            availableCents={wallet.stats.availableCents}
            defaults={{
              method: profile?.payoutMethod ?? null,
              destination: profile?.payoutDestination ?? null,
              destinationName: profile?.payoutDestinationName ?? null,
            }}
          />
        )}
      </section>

      {/* Pending payments (escrow) */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Pending payments</h2>
          <span className="text-xs text-gray-500">In escrow until tasks complete</span>
        </div>
        {escrow.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-600">
            Nothing in escrow right now.
          </div>
        ) : (
          <ul className="space-y-2">
            {escrow.map((p) => {
              const completedAlready =
                p.booking.status === BookingStatus.COMPLETED;
              return (
                <li key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/tasks/${p.booking.task.id}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {p.booking.task.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {completedAlready
                          ? "Releasing — should appear shortly"
                          : "Customer pays; releases when they mark complete"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatMoney(p.amountCents, p.currency)}
                      </p>
                      <span className="badge mt-1 bg-yellow-100 text-yellow-800">
                        In escrow
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Transaction history */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Transaction history</h2>
          {wallet.transactions.length > 0 ? (
            <span className="text-xs text-gray-500">
              {wallet.transactions.length} entries
            </span>
          ) : null}
        </div>
        {wallet.transactions.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-600">
            No activity yet. Send an offer on an open task to get started.
            <div className="mt-3">
              <Link href="/tasks" className="text-brand-700 hover:underline">
                Browse open tasks →
              </Link>
            </div>
          </div>
        ) : (
          <ul className="card divide-y divide-gray-100">
            {wallet.transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currency={wallet.currency} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ============================ Bits ============================ */

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "brand" | "gray" | "yellow";
}) {
  const cls =
    tone === "brand"
      ? "text-brand-700"
      : tone === "yellow"
        ? "text-yellow-700"
        : "text-gray-700";
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${cls}`}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-gray-500">{sub}</p> : null}
    </div>
  );
}

const TYPE_STYLES: Record<
  WalletTransaction["type"],
  { icon: string; tone: string; sign: "+" | "−" | "" }
> = {
  EARNED: { icon: "↓", tone: "bg-brand-100 text-brand-700", sign: "+" },
  ESCROW_HOLD: { icon: "⏳", tone: "bg-yellow-100 text-yellow-800", sign: "" },
  ESCROW_REFUND: { icon: "↩", tone: "bg-gray-100 text-gray-700", sign: "" },
  WITHDRAW_PENDING: { icon: "↑", tone: "bg-yellow-100 text-yellow-800", sign: "−" },
  WITHDRAW_PAID: { icon: "↑", tone: "bg-gray-100 text-gray-700", sign: "−" },
  WITHDRAW_FAILED: { icon: "!", tone: "bg-red-100 text-red-700", sign: "" },
  WITHDRAW_CANCELLED: { icon: "×", tone: "bg-gray-100 text-gray-600", sign: "" },
};

function TransactionRow({
  tx,
  currency,
}: {
  tx: WalletTransaction;
  currency: string;
}) {
  const styles = TYPE_STYLES[tx.type];
  const amount = formatMoney(tx.amountCents, tx.currency ?? currency);
  const Body = (
    <div className="flex items-center gap-3 p-4">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.tone} text-sm font-semibold`}
        aria-hidden="true"
      >
        {styles.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{tx.title}</p>
        {tx.subtitle ? (
          <p className="mt-0.5 truncate text-xs text-gray-500">{tx.subtitle}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold ${
            tx.direction === "credit"
              ? "text-brand-700"
              : tx.direction === "debit"
                ? "text-gray-900"
                : "text-yellow-700"
          }`}
        >
          {styles.sign}
          {amount}
        </p>
        <p className="text-[11px] text-gray-500">
          {new Date(tx.date).toLocaleDateString()} · {tx.status}
        </p>
      </div>
    </div>
  );
  return (
    <li>
      {tx.href ? (
        <Link href={tx.href} className="block hover:bg-gray-50">
          {Body}
        </Link>
      ) : (
        Body
      )}
    </li>
  );
}
