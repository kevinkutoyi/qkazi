import { NextResponse } from "next/server";
import { z } from "zod";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { publish } from "@/lib/message-events";
import { notify } from "@/lib/notifications";

const sendSchema = z.object({
  body: z.string().min(1).max(2000),
});

async function getChatForUser(chatId: string, userId: string) {
  return prisma.chat.findFirst({
    where: {
      id: chatId,
      booking: {
        OR: [
          { taskerId: userId },
          { task: { customerId: userId } },
        ],
      },
    },
    include: {
      booking: {
        include: {
          task: { select: { id: true, title: true, customerId: true } },
        },
      },
    },
  });
}

/**
 * GET /api/chats/:id/messages?after=ISO — list messages in the chat,
 * oldest-first. Optional `after` returns only messages newer than the
 * given ISO timestamp (used after SSE pings to fetch incremental state).
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const chat = await getChatForUser(params.id, auth.user.sub);
  if (!chat) return jsonError("Chat not found", 404);

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");
  const where: any = { chatId: chat.id };
  if (after) {
    const dt = new Date(after);
    if (!Number.isNaN(dt.getTime())) where.createdAt = { gt: dt };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages });
}

/**
 * POST /api/chats/:id/messages  { body } — send a message into a chat the
 * caller is a participant in.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const chat = await getChatForUser(params.id, auth.user.sub);
  if (!chat) return jsonError("Chat not found", 404);

  const parsed = await parseBody(req, sendSchema);
  if ("error" in parsed) return parsed.error;

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: auth.user.sub,
        body: parsed.data.body.trim(),
      },
    }),
    prisma.chat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  // Push to anyone listening to this chat.
  publish(chat.id, { type: "message", messageId: message.id });

  // Notify the other party.
  const recipientId =
    chat.booking.task.customerId === auth.user.sub
      ? chat.booking.taskerId
      : chat.booking.task.customerId;
  notify({
    userId: recipientId,
    type: NotificationType.NEW_MESSAGE,
    title: "New message",
    body: parsed.data.body.slice(0, 140),
    url: `/chats/${chat.id}`,
    data: { chatId: chat.id, messageId: message.id },
  });

  return NextResponse.json({ message }, { status: 201 });
}
