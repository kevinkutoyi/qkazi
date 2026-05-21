import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { subscribe } from "@/lib/offer-events";

/**
 * GET /api/tasks/:id/offers/stream
 *
 * Server-Sent Events stream for the task owner. Pushes a small JSON payload
 * whenever a new bid is placed or an existing bid changes status. The client
 * uses this as a trigger to re-render the page via router.refresh().
 *
 * Auth: only the customer who posted the task may subscribe.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    select: { customerId: true },
  });
  if (!task) return new Response("Not found", { status: 404 });
  if (task.customerId !== user.sub) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function safeEnqueue(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream already closed.
        }
      }

      // Initial hello so the client knows the channel is open.
      safeEnqueue(`event: connected\ndata: {"ok":true}\n\n`);

      unsubscribe = subscribe(params.id, (frame) => safeEnqueue(frame));

      // Comment lines double as heartbeats; intermediaries that buffer SSE
      // (e.g. some proxies) flush after a small amount of data.
      heartbeat = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 25_000);

      // Tear down when the client disconnects.
      const abort = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", abort);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Hint to common reverse proxies (nginx) to flush instead of buffering.
      "X-Accel-Buffering": "no",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
