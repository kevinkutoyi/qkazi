"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "MARK_PROCESSING" | "MARK_PAID" | "MARK_FAILED" | "CANCEL";

export default function PayoutActions({
  payoutId,
  currentStatus,
}: {
  payoutId: string;
  currentStatus: "REQUESTED" | "PROCESSING";
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [reference, setReference] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reference: action === "MARK_PAID" ? reference.trim() : undefined,
          failureReason:
            action === "MARK_FAILED" ? failureReason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setAction(null);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentStatus === "REQUESTED" ? (
          <button
            type="button"
            onClick={() => setAction("MARK_PROCESSING")}
            className="btn-secondary text-xs"
          >
            Mark processing
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setAction("MARK_PAID")}
          className="btn-primary text-xs"
        >
          Mark paid
        </button>
        <button
          type="button"
          onClick={() => setAction("MARK_FAILED")}
          className="btn-secondary text-xs"
        >
          Mark failed
        </button>
        <button
          type="button"
          onClick={() => setAction("CANCEL")}
          className="btn-danger text-xs"
        >
          Cancel
        </button>
      </div>

      {action === "MARK_PAID" ? (
        <div className="rounded-md border border-gray-200 p-3">
          <label className="label" htmlFor={`ref-${payoutId}`}>
            Payment reference (optional)
          </label>
          <input
            id={`ref-${payoutId}`}
            className="input"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. M-Pesa transaction code"
          />
        </div>
      ) : null}

      {action === "MARK_FAILED" ? (
        <div className="rounded-md border border-gray-200 p-3">
          <label className="label" htmlFor={`fail-${payoutId}`}>
            Failure reason (shown to tasker)
          </label>
          <input
            id={`fail-${payoutId}`}
            className="input"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            placeholder="e.g. M-Pesa number was invalid"
          />
        </div>
      ) : null}

      {action ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={action === "CANCEL" ? "btn-danger" : "btn-primary"}
          >
            {busy
              ? "Saving…"
              : action === "MARK_PROCESSING"
                ? "Confirm: mark processing"
                : action === "MARK_PAID"
                  ? "Confirm: mark paid"
                  : action === "MARK_FAILED"
                    ? "Confirm: mark failed"
                    : "Confirm cancel"}
          </button>
          <button
            type="button"
            onClick={() => setAction(null)}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
