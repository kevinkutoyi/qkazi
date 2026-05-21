import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

/**
 * GET /api/notifications?limit=20
 * Returns the most recent notifications + an unread count.
 */
export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 20), 1),
    100,
  );

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.user.sub },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: auth.user.sub, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications: items, unreadCount });
}

export const dynamic = "force-dynamic";
