import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Thin helper for inserting a Notification row. Notifications are
 * fire-and-forget: every caller wraps this in a try/catch so a notification
 * failure can never break the underlying business action.
 */
export async function notify(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
  data?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        url: input.url ?? null,
        data: input.data ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    // Don't crash the request just because we couldn't log a bell ping.
    console.error("[notify] failed:", err);
  }
}

/** Mark all unread notifications for a user as read. */
export async function markAllRead(userId: string): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}
