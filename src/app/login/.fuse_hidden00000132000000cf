"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import GoogleButton from "@/components/GoogleButton";

const OAUTH_ERROR_COPY: Record<string, string> = {
  state_mismatch: "Your sign-in session expired. Please try again.",
  email_not_verified:
    "Your Google account's email isn't verified. Verify it with Google and retry.",
  provider_error: "Couldn't complete sign-in with Google. Please try again.",
  missing_code: "Sign-in was cancelled before it could finish.",
  access_denied: "Sign-in was cancelled.",
};

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified") === "1";
  const oauthError = params.get("oauth_error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] =
    useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setUnverified(data.email ?? email);
          setError(null);
        } else {
          setError(data.error ?? "Login failed");
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!unverified) return;
    setResendState("sending");
    try {
      await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverified }),
      });
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-600">Log in to your Qkazi account.</p>

      {verified ? (
        <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
          Your email is confirmed. Log in to continue.
        </div>
      ) : null}
      {oauthError ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-800">
          {OAUTH_ERROR_COPY[oauthError] ?? "Sign-in failed. Please try again."}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <GoogleButton />
        <div className="relative my-2 text-center text-xs text-gray-400">
          <span className="absolute inset-y-1/2 left-0 right-0 -z-10 h-px bg-gray-200" />
          <span className="bg-gray-50 px-2">or with email</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 space-y-4">
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
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label mb-0" htmlFor="password">
              Password
            </label>
            <Link
              className="text-xs text-brand-700 hover:underline"
              href="/password-reset"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {unverified ? (
          <div className="rounded-md border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-900">
            <p>
              Please confirm your email before logging in. We sent a link to{" "}
              <strong>{unverified}</strong>.
            </p>
            <button
              type="button"
              onClick={resendVerification}
              disabled={resendState !== "idle"}
              className="mt-2 text-sm font-medium text-brand-700 hover:underline disabled:opacity-60"
            >
              {resendState === "sent"
                ? "Email sent — check your inbox."
                : resendState === "sending"
                  ? "Sending…"
                  : "Resend confirmation email"}
            </button>
          </div>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        No account?{" "}
        <Link className="text-brand-700 hover:underline" href="/register">
          Sign up
        </Link>
      </p>
    </div>
  );
}
