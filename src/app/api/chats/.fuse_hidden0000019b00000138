import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

/**
 * GET /api/chats — list the current user's chats with last-message preview
 * and unread count. Customers see chats on their tasks; taskers see chats
 * for their bookings.
 */
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const chats = await prisma.chat.findMany({
    where: {
      booking: {
        OR: [
          { taskerId: auth.user.sub },
          { task: { customerId: auth.user.sub } },
        ],
      },
    },
    orderBy: [
      { lastMessageAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    include: {
      booking: {
        include: {
          tasker: {
            select: {
              id: true,
              name: true,
              taskerProfile: { select: { photoUrl: true } },
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              customerId: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: {
            where: { readAt: null, senderId: { not: auth.user.sub } },
          },
        },
      },
    },
  });
  return NextResponse.json({ chats });
}
