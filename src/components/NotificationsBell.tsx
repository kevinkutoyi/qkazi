"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

const POLL_MS = 30_000;

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=15", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationRow[];
        unreadCount: number;
      };
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + light polling while mounted. Cheap to call (one indexed
  // count query + one limit-15 fetch). Swap for SSE later if needed.
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  // Refresh when the panel opens so the list is fresh.
  useEffect(() => {
    if (open) load();
  }, [open]);

  async function markAll() {
    setItems((cur) =>
      cur.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    );
    setUnread(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(
      () => undefined,
    );
  }

  async function markOne(id: string) {
    setItems((cur) =>
      cur.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    setUnread((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(
      () => undefined,
    );
  }

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute right-0 top-0 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-gray-200"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              className="text-xs text-brand-700 hover:underline disabled:opacity-50"
              onClick={markAll}
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>

          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
            {loading && items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-gray-500">
                Loading…
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-gray-500">
                You&apos;re all caught up.
              </li>
            ) : (
              items.map((n) => {
                const Body = (
                  <div
                    className={`px-4 py-3 ${n.readAt ? "" : "bg-brand-50/50"}`}
                  >
                    <p className="flex items-start gap-2 text-sm">
                      {!n.readAt ? (
                        <span
                          className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="mt-1 inline-block h-1.5 w-1.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        <span className="font-medium">{n.title}</span>
                        {n.body ? (
                          <span className="ml-1 text-gray-600">{n.body}</span>
                        ) : null}
                      </span>
                    </p>
                    <p className="mt-1 pl-4 text-[11px] text-gray-500">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                );
                const onClick = () => {
                  if (!n.readAt) markOne(n.id);
                };
                return (
                  <li key={n.id}>
                    {n.url ? (
                      <Link
                        href={n.url}
                        onClick={onClick}
                        className="block hover:bg-gray-50"
                      >
                        {Body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onClick}
                        className="block w-full text-left hover:bg-gray-50"
                      >
                        {Body}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-gray-100 px-4 py-2 text-center">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString();
}
