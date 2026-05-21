"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Listens to the task's SSE offer stream and re-renders the page when a new
 * offer arrives or an existing one changes status. The server-rendered offers
 * list is the source of truth; this component is purely a refresh trigger.
 *
 * A tiny "Live" indicator is rendered for transparency (red dot = reconnecting).
 */
export default function LiveOffersListener({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    function open() {
      if (cancelled) return;
      es = new EventSource(`/api/tasks/${taskId}/offers/stream`);
      es.addEventListener("connected", () => setConnected(true));
      es.addEventListener("message", (e) => {
        // Any payload triggers a refresh — server's view is authoritative.
        try {
          // Parse defensively; we don't need the contents, but want to
          // ignore non-JSON keepalives.
          if (e.data) JSON.parse(e.data as string);
          router.refresh();
        } catch {
          // not JSON — ignore (heartbeats are comment frames, not "message")
        }
      });
      es.onopen = () => setConnected(true);
      es.onerror = () => {
        // EventSource will auto-reconnect; just reflect the disconnected state.
        setConnected(false);
      };
    }

    open();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [taskId, router]);

  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs"
      title={connected ? "Connected — new offers will appear automatically" : "Reconnecting…"}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          connected ? "bg-brand-500" : "bg-gray-400"
        } ${connected ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
      <span className={connected ? "text-brand-700" : "text-gray-500"}>
        {connected ? "Live" : "Reconnecting…"}
      </span>
    </div>
  );
}
