"use client";

import Link from "next/link";
import { useState } from "react";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await fetch("/api/auth/password-reset", {
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
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-gray-600">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      {state === "sent" ? (
        <div className="mt-6 rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-medium">Check your inbox.</p>
          <p className="mt-1">
            If an account exists for <strong>{email}</strong>, a reset link is on
            its way. The link expires in 1 hour.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={state === "sending"}
          >
            {state === "sending" ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-xs text-gray-500">
            For your security, we always say &quot;sent&quot; whether or not the
            email matches an account.
          </p>
        </form>
      )}

      <p className="mt-6 text-sm text-gray-600">
        Remembered it?{" "}
        <Link className="text-brand-700 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
