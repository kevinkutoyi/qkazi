"use client";

import { useState } from "react";

export default function CheckoutButton({ bookingId }: { bookingId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start payment");
        return;
      }
      // Full-page navigation to Pesapal's hosted page.
      window.location.assign(data.redirectUrl);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="btn-primary w-full"
      >
        {busy ? "Connecting to Pesapal…" : "Continue to Pesapal"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : null}
      <p className="mt-3 text-xs text-gray-500">
        You&apos;ll be redirected to Pesapal&apos;s hosted checkout and
        returned here when it&apos;s done.
      </p>
    </div>
  );
}
