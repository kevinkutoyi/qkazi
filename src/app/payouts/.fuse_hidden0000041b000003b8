"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { centsToDecimal, decimalToCents, formatMoney } from "@/lib/money";

type PayoutMethod = "M_PESA" | "BANK" | "MANUAL";

export default function PayoutRequestForm({
  availableCents,
  defaults,
}: {
  availableCents: number;
  defaults: {
    method: PayoutMethod | null;
    destination: string | null;
    destinationName: string | null;
  };
}) {
  const router = useRouter();
  const [method, setMethod] = useState<PayoutMethod>(
    defaults.method ?? "M_PESA",
  );
  const [amount, setAmount] = useState<string>(
    String(centsToDecimal(availableCents)),
  );
  const [destination, setDestination] = useState(defaults.destination ?? "");
  const [destinationName, setDestinationName] = useState(
    defaults.destinationName ?? "",
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = decimalToCents(Number(amount) || 0);
  const overBalance = amountCents > availableCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (amountCents <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (overBalance) {
      setError("Amount exceeds your available balance.");
      return;
    }
    if (!destination.trim()) {
      setError("Add a payout destination.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          method,
          destination: destination.trim(),
          destinationName: destinationName.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not request payout");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label className="label">Payout method</label>
        <div className="grid grid-cols-3 gap-2">
          {(["M_PESA", "BANK", "MANUAL"] as PayoutMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                method === m
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {m === "M_PESA"
                ? "M-Pesa"
                : m === "BANK"
                  ? "Bank"
                  : "Other"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="dest">
          {method === "M_PESA"
            ? "M-Pesa phone number"
            : method === "BANK"
              ? "Bank account number"
              : "Destination"}
        </label>
        <input
          id="dest"
          required
          className="input"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={
            method === "M_PESA"
              ? "+254712345678"
              : method === "BANK"
                ? "Account number"
                : "How should we send it?"
          }
        />
      </div>

      {method !== "M_PESA" ? (
        <div>
          <label className="label" htmlFor="dest-name">
            {method === "BANK" ? "Bank name + account holder" : "Label"}
          </label>
          <input
            id="dest-name"
            className="input"
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            placeholder={
              method === "BANK" ? "e.g. KCB · John Doe" : "Optional"
            }
          />
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="amount">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min={1}
          max={centsToDecimal(availableCents)}
          required
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Available: <strong>{formatMoney(availableCents)}</strong>
        </p>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          maxLength={500}
          className="input min-h-[60px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything we should know?"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={submitting || overBalance}
      >
        {submitting ? "Submitting…" : "Request payout"}
      </button>
    </form>
  );
}
