import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAuth } from "@/lib/api-utils";
import { publish } from "@/lib/message-events";

/**
 * POST /api/chats/:id/read — mark every incoming message in the chat as
 * read. Returns the count flipped so the UI can update its badge optimistic.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  // Verify membership without leaking which chats exist.
  const chat = await prisma.chat.findFirst({
    where: {
      id: params.id,
      booking: {
        OR: [
          { taskerId: auth.user.sub },
          { task: { customerId: auth.user.sub } },
        ],
      },
    },
    select: { id: true },
  });
  if (!chat) return jsonError("Chat not found", 404);

  const res = await prisma.message.updateMany({
    where: {
      chatId: chat.id,
      senderId: { not: auth.user.sub },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  if (res.count > 0) {
    publish(chat.id, { type: "read", readerId: auth.user.sub });
  }
  return NextResponse.json({ ok: true, count: res.count });
}
