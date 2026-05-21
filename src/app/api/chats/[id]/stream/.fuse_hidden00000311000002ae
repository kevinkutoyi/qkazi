import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { subscribe } from "@/lib/message-events";

/**
 * GET /api/chats/:id/stream — SSE channel for new messages / read events.
 * Restricted to participants.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const chat = await prisma.chat.findFirst({
    where: {
      id: params.id,
      booking: {
        OR: [
          { taskerId: user.sub },
          { task: { customerId: user.sub } },
        ],
      },
    },
    select: { id: true },
  });
  if (!chat) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsub: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safe = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          // closed
        }
      };
      safe(`event: connected\ndata: {"ok":true}\n\n`);
      unsub = subscribe(chat.id, (frame) => safe(frame));
      heartbeat = setInterval(() => safe(`: ping ${Date.now()}\n\n`), 25_000);
      const abort = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsub) unsub();
        try {
          controller.close();
        } catch {
          // closed
        }
      };
      req.signal.addEventListener("abort", abort);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsub) unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
