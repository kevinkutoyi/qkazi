import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAuth } from "@/lib/api-utils";

/**
 * GET /api/payments/:id
 * Returns the current Payment row. Restricted to the customer who owns it.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      booking: {
        select: {
          id: true,
          taskId: true,
          taskerId: true,
          status: true,
          task: { select: { title: true, customerId: true } },
        },
      },
    },
  });
  if (!payment) return jsonError("Payment not found", 404);
  if (
    auth.user.sub !== payment.customerId &&
    auth.user.sub !== payment.booking.taskerId &&
    auth.user.role !== "ADMIN"
  ) {
    return jsonError("Forbidden", 403);
  }
  return NextResponse.json({ payment });
}
