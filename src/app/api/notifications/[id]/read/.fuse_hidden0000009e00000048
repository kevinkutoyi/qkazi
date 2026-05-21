import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAuth } from "@/lib/api-utils";

/**
 * POST /api/notifications/:id/read — mark a single notification as read.
 * Idempotent; setting readAt again is a no-op.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  // updateMany lets us scope to userId in the same query (avoids a fetch+verify
  // round-trip; doesn't error if the row doesn't belong to the user).
  const res = await prisma.notification.updateMany({
    where: { id: params.id, userId: auth.user.sub, readAt: null },
    data: { readAt: new Date() },
  });
  if (res.count === 0) {
    // Either already read, doesn't exist, or not theirs. Treat as success;
    // we don't want the bell to error out on stale clicks.
    return NextResponse.json({ ok: true, alreadyRead: true });
  }
  return NextResponse.json({ ok: true });
}
