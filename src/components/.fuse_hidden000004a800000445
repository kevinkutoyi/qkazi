"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FavoriteButton({
  taskerId,
  initialFavorited,
}: {
  taskerId: string;
  initialFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !favorited;
    setFavorited(next); // optimistic
    setBusy(true);
    try {
      if (next) {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskerId }),
        });
        if (!res.ok) setFavorited(!next);
      } else {
        const res = await fetch(`/api/favorites/${taskerId}`, {
          method: "DELETE",
        });
        if (!res.ok) setFavorited(!next);
      }
      router.refresh();
    } catch {
      setFavorited(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
        favorited
          ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
          : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
      }`}
      disabled={busy}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {favorited ? "Favorited" : "Save"}
    </button>
  );
}
