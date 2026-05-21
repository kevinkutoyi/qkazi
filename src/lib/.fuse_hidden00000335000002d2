import {
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
} from "@prisma/client";
import { prisma } from "./prisma";
import { DEFAULT_CURRENCY } from "./money";

/**
 * Wallet model — pure read view over existing Payment + Payout rows.
 *
 * We don't have a separate transactions table because the source data is
 * already canonical. Instead `getWalletState` derives a typed transaction
 * stream so the wallet page renders one unified timeline.
 */

export type TransactionType =
  | "EARNED"            // payment RELEASED → cash in tasker's balance
  | "ESCROW_HOLD"       // payment CAPTURED but booking not yet complete
  | "ESCROW_REFUND"     // payment REFUNDED → reversed
  | "WITHDRAW_PENDING"  // payout REQUESTED or PROCESSING
  | "WITHDRAW_PAID"     // payout PAID
  | "WITHDRAW_FAILED"   // payout FAILED
  | "WITHDRAW_CANCELLED";

export type TransactionDirection = "credit" | "debit" | "hold";

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  direction: TransactionDirection;
  amountCents: number;
  currency: string;
  title: string;
  subtitle?: string;
  date: Date;
  status: string;
  href?: string;
}

export interface WalletStats {
  /** Money the tasker has actually earned — sum of RELEASED payments. */
  earnedCents: number;
  /** Sum of PAID payouts. */
  withdrawnCents: number;
  /** REQUESTED + PROCESSING payouts that haven't settled yet. */
  pendingWithdrawalCents: number;
  /** CAPTURED but not yet RELEASED payments — funds the customer paid but
   *  that haven't unlocked because the task isn't marked complete. */
  inEscrowCents: number;
  /** Withdrawable: earned − withdrawn − pendingWithdrawal. */
  availableCents: number;
}

export interface WalletState {
  stats: WalletStats;
  transactions: WalletTransaction[];
  currency: string;
}

export async function getWalletState(taskerId: string): Promise<WalletState> {
  // Pull everything we need in parallel. For the transaction stream we keep
  // a generous cap (50 latest of each kind) — wallet pages don't need
  // pagination until users have lots of activity.
  const [paymentsOnMyBookings, myPayouts] = await Promise.all([
    prisma.payment.findMany({
      where: { booking: { taskerId } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        booking: {
          include: {
            task: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.payout.findMany({
      where: { taskerId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  // --- Stats ---------------------------------------------------------------
  let earnedCents = 0;
  let inEscrowCents = 0;
  for (const p of paymentsOnMyBookings) {
    if (p.status === PaymentStatus.RELEASED) earnedCents += p.amountCents;
    else if (
      p.status === PaymentStatus.CAPTURED &&
      p.booking.status !== BookingStatus.COMPLETED
    ) {
      inEscrowCents += p.amountCents;
    }
  }
  let withdrawnCents = 0;
  let pendingWithdrawalCents = 0;
  for (const p of myPayouts) {
    if (p.status === PayoutStatus.PAID) withdrawnCents += p.amountCents;
    else if (
      p.status === PayoutStatus.REQUESTED ||
      p.status === PayoutStatus.PROCESSING
    ) {
      pendingWithdrawalCents += p.amountCents;
    }
  }
  const availableCents = Math.max(
    0,
    earnedCents - withdrawnCents - pendingWithdrawalCents,
  );

  // --- Transaction ledger --------------------------------------------------
  const txs: WalletTransaction[] = [];

  for (const p of paymentsOnMyBookings) {
    const taskTitle = p.booking.task.title;
    const taskHref = `/tasks/${p.booking.task.id}`;
    switch (p.status) {
      case PaymentStatus.RELEASED:
        txs.push({
          id: `pay:${p.id}:released`,
          type: "EARNED",
          direction: "credit",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `Earned from "${taskTitle}"`,
          subtitle: "Payment released to your wallet",
          date: p.releasedAt ?? p.updatedAt,
          status: "Released",
          href: taskHref,
        });
        break;
      case PaymentStatus.CAPTURED:
        txs.push({
          id: `pay:${p.id}:held`,
          type: "ESCROW_HOLD",
          direction: "hold",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `In escrow for "${taskTitle}"`,
          subtitle: "Releases when the customer marks the task complete",
          date: p.capturedAt ?? p.updatedAt,
          status: "In escrow",
          href: taskHref,
        });
        break;
      case PaymentStatus.REFUNDED:
        txs.push({
          id: `pay:${p.id}:refunded`,
          type: "ESCROW_REFUND",
          direction: "hold",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `Refunded for "${taskTitle}"`,
          subtitle: "The customer was refunded",
          date: p.refundedAt ?? p.updatedAt,
          status: "Refunded",
          href: taskHref,
        });
        break;
      default:
        // PENDING / AUTHORIZED / FAILED / CANCELLED — not part of the tasker
        // ledger until they capture.
        break;
    }
  }

  for (const p of myPayouts) {
    const dest = p.destinationName
      ? `${p.destinationName} · ${p.destination}`
      : p.destination;
    switch (p.status) {
      case PayoutStatus.PAID:
        txs.push({
          id: `out:${p.id}:paid`,
          type: "WITHDRAW_PAID",
          direction: "debit",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `Withdrawn to ${dest}`,
          subtitle: p.reference
            ? `Reference ${p.reference}`
            : `via ${p.method}`,
          date: p.processedAt ?? p.updatedAt,
          status: "Paid",
        });
        break;
      case PayoutStatus.REQUESTED:
      case PayoutStatus.PROCESSING:
        txs.push({
          id: `out:${p.id}:pending`,
          type: "WITHDRAW_PENDING",
          direction: "debit",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `Withdrawal to ${dest}`,
          subtitle:
            p.status === PayoutStatus.PROCESSING
              ? "Processing — funds en route"
              : "Requested — awaiting admin",
          date: p.requestedAt,
          status: p.status === PayoutStatus.PROCESSING ? "Processing" : "Requested",
        });
        break;
      case PayoutStatus.FAILED:
        txs.push({
          id: `out:${p.id}:failed`,
          type: "WITHDRAW_FAILED",
          direction: "debit",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `Withdrawal failed`,
          subtitle: p.failureReason ?? `via ${p.method}`,
          date: p.processedAt ?? p.updatedAt,
          status: "Failed",
        });
        break;
      case PayoutStatus.CANCELLED:
        txs.push({
          id: `out:${p.id}:cancelled`,
          type: "WITHDRAW_CANCELLED",
          direction: "debit",
          amountCents: p.amountCents,
          currency: p.currency,
          title: `Withdrawal cancelled`,
          subtitle: `via ${p.method}`,
          date: p.processedAt ?? p.updatedAt,
          status: "Cancelled",
        });
        break;
    }
  }

  // Newest first.
  txs.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    stats: {
      earnedCents,
      withdrawnCents,
      pendingWithdrawalCents,
      inEscrowCents,
      availableCents,
    },
    transactions: txs,
    currency: DEFAULT_CURRENCY,
  };
}
