"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import StarRating from "@/components/StarRating";

export default function ReviewForm({
  bookingId,
  subjectName,
}: {
  bookingId: string;
  subjectName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Pick a rating from 1 to 5 stars.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save review");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-gray-700">How was {subjectName}?</p>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        className="input min-h-[80px]"
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional — share what stood out."
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        className="btn-primary"
        disabled={busy || rating === 0}
      >
        {busy ? "Saving…" : "Post review"}
      </button>
    </form>
  );
}
