import { NextResponse } from "next/server";
import { markAllRead } from "@/lib/notifications";
import { requireAuth } from "@/lib/api-utils";

/**
 * POST /api/notifications/read-all — mark every unread notification of mine
 * as read. Returns the count flipped.
 */
export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const count = await markAllRead(auth.user.sub);
  return NextResponse.json({ ok: true, count });
}
