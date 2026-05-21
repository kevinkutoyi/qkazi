"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function resend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email) return;
    setState("sending");
    try {
      await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState("sent");
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
        ✉️
      </div>
      <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
      <p className="mt-2 text-sm text-gray-600">
        {initialEmail ? (
          <>
            We sent a confirmation link to{" "}
            <strong className="text-gray-900">{initialEmail}</strong>. Click it to
            finish setting up your account, then log in.
          </>
        ) : (
          <>
            We sent you a confirmation link. Click it to finish setting up your
            account, then log in.
          </>
        )}
      </p>

      <form onSubmit={resend} className="mt-6 space-y-3 text-left">
        <label className="label" htmlFor="email">
          Didn&apos;t get the email?
        </label>
        <input
          id="email"
          type="email"
          required
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button
          type="submit"
          className="btn-secondary w-full"
          disabled={state !== "idle" || !email}
        >
          {state === "sent"
            ? "Email sent — check your inbox."
            : state === "sending"
              ? "Sending…"
              : "Resend confirmation email"}
        </button>
        <p className="text-xs text-gray-500">
          For your security, we always say &quot;sent&quot; even if no account
          matches that address.
        </p>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Already confirmed?{" "}
        <Link className="text-brand-700 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
