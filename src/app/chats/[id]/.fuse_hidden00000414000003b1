"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export default function ChatThread({
  chatId,
  myUserId,
  initialMessages,
}: {
  chatId: string;
  myUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Mark incoming messages as read on mount and whenever new ones arrive.
  useEffect(() => {
    const hasUnreadFromOther = messages.some(
      (m) => m.senderId !== myUserId && !m.readAt,
    );
    if (!hasUnreadFromOther) return;
    fetch(`/api/chats/${chatId}/read`, { method: "POST" }).catch(
      () => undefined,
    );
  }, [messages, myUserId, chatId]);

  // Auto-scroll to the bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // SSE — when something happens in the chat, fetch deltas since our newest
  // message and append.
  useEffect(() => {
    const es = new EventSource(`/api/chats/${chatId}/stream`);
    es.addEventListener("message", () => {
      // Determine the "since" cursor — newest message we have.
      const last = messages[messages.length - 1];
      const after = last
        ? last.createdAt
        : new Date(Date.now() - 60_000).toISOString();
      fetch(`/api/chats/${chatId}/messages?after=${encodeURIComponent(after)}`)
        .then((r) => r.json())
        .then((data: { messages: Message[] }) => {
          if (data.messages?.length) {
            setMessages((prev) => {
              const ids = new Set(prev.map((m) => m.id));
              const next = [...prev];
              for (const m of data.messages) {
                if (!ids.has(m.id)) next.push(m);
              }
              return next;
            });
          }
        })
        .catch(() => undefined);
    });
    es.onerror = () => {
      // EventSource auto-reconnects.
    };
    return () => es.close();
  }, [chatId, messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setError(null);
    setSending(true);
    // Optimistic placeholder.
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: myUserId,
      body: draft.trim(),
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    const body = draft.trim();
    setDraft("");

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send");
        // Drop the optimistic message on failure.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      // Replace temp with server-confirmed.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                id: data.message.id,
                senderId: data.message.senderId,
                body: data.message.body,
                createdAt: data.message.createdAt,
                readAt: data.message.readAt ?? null,
              }
            : m,
        ),
      );
    } catch {
      setError("Network error");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex h-[60vh] flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            No messages yet. Say hi.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.senderId === myUserId;
              const sameAsPrev =
                i > 0 && messages[i - 1].senderId === m.senderId;
              return (
                <li
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    } ${sameAsPrev ? "rounded-t-md" : ""}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-brand-50/80" : "text-gray-500"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-gray-100 p-3"
      >
        <label className="sr-only" htmlFor="msg">
          Message
        </label>
        <textarea
          id="msg"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          className="input flex-1 resize-none"
          placeholder="Type a message…"
          maxLength={2000}
          disabled={sending}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={sending || !draft.trim()}
        >
          Send
        </button>
      </form>
      {error ? (
        <p className="px-4 pb-2 text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
