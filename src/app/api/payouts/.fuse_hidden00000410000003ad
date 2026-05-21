import { NextResponse } from "next/server";
import { z } from "zod";
import { PayoutMethod, PayoutStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { computeTaskerBalance } from "@/lib/payouts";
import { DEFAULT_CURRENCY } from "@/lib/money";

const createSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.nativeEnum(PayoutMethod),
  destination: z.string().min(3).max(120),
  destinationName: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * GET /api/payouts — list the current tasker's payouts.
 */
export async function GET() {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;

  const [payouts, balance] = await Promise.all([
    prisma.payout.findMany({
      where: { taskerId: auth.user.sub },
      orderBy: { requestedAt: "desc" },
    }),
    computeTaskerBalance(auth.user.sub),
  ]);
  return NextResponse.json({ payouts, balance });
}

/**
 * POST /api/payouts — tasker creates a payout request.
 * Validated against the available balance. The destination snapshot is
 * copied onto the Payout row so historic records stay accurate if the
 * tasker later changes their default.
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, createSchema);
  if ("error" in parsed) return parsed.error;
  const { amountCents, method, destination, destinationName, notes } =
    parsed.data;

  const balance = await computeTaskerBalance(auth.user.sub);
  if (amountCents > balance.availableCents) {
    return NextResponse.json(
      {
        error: "Amount exceeds your available balance.",
        available: balance.availableCents,
      },
      { status: 400 },
    );
  }

  // Update default payout info on the profile so the next request pre-fills.
  await prisma.taskerProfile
    .update({
      where: { userId: auth.user.sub },
      data: {
        payoutMethod: method,
        payoutDestination: destination,
        payoutDestinationName: destinationName ?? null,
      },
    })
    .catch(() => undefined);

  const payout = await prisma.payout.create({
    data: {
      taskerId: auth.user.sub,
      amountCents,
      currency: DEFAULT_CURRENCY,
      status: PayoutStatus.REQUESTED,
      method,
      destination,
      destinationName: destinationName ?? null,
      notes: notes ?? null,
    },
  });
  return NextResponse.json({ payout }, { status: 201 });
}
