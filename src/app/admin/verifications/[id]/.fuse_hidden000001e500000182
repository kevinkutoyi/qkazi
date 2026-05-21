"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DecisionForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (decision === "REJECT" && !note.trim()) {
      setError("Add a note explaining the rejection.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/verifications/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: decision === "REJECT" ? note.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save decision");
        return;
      }
      router.push("/admin/verifications");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["APPROVE", "REJECT"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDecision(d)}
            className={`rounded-md border px-4 py-3 text-sm font-medium transition ${
              decision === d
                ? d === "APPROVE"
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-red-600 bg-red-50 text-red-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {d === "APPROVE" ? "Approve" : "Reject"}
          </button>
        ))}
      </div>

      {decision === "REJECT" ? (
        <div>
          <label className="label" htmlFor="note">
            Reason (sent to the tasker)
          </label>
          <textarea
            id="note"
            className="input min-h-[80px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. ID photo is blurry; please retake with all four corners visible."
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        className={decision === "APPROVE" ? "btn-primary" : "btn-danger"}
        disabled={submitting}
      >
        {submitting
          ? "Saving…"
          : decision === "APPROVE"
            ? "Approve profile"
            : "Reject profile"}
      </button>
    </form>
  );
}
