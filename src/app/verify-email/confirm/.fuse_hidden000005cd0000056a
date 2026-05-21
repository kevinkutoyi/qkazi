"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * The user lands here only when something went wrong: missing/invalid/expired
 * token. The success path of GET /api/auth/verify-email redirects straight
 * to /login?verified=1, so this page never renders on success.
 *
 * If the page is reached with a ?token=... param (e.g. a user pasted the
 * link into a browser that handles JS-only redirects), we forward to the
 * API to do the actual confirmation.
 */
const ERROR_COPY: Record<string, string> = {
  missing: "That link is missing a token.",
  not_found: "That link is invalid or has already been used.",
  expired: "That link has expired. Request a new one below.",
};

export default function VerifyEmailConfirmPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const errorKey = params.get("error");

  useEffect(() => {
    if (token && !errorKey) {
      // Hit the API to actually consume the token; it will redirect us.
      window.location.replace(
        `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      );
    }
  }, [token, errorKey]);

  if (token && !errorKey) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Confirming…</h1>
        <p className="mt-2 text-sm text-gray-600">
          One moment while we verify your email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
        ⚠️
      </div>
      <h1 className="mt-4 text-2xl font-bold">Couldn&apos;t confirm email</h1>
      <p className="mt-2 text-sm text-gray-600">
        {ERROR_COPY[errorKey ?? ""] ??
          "This confirmation link isn't valid anymore."}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link href="/verify-email" className="btn-primary">
          Request a new link
        </Link>
        <Link href="/login" className="btn-secondary">
          Back to log in
        </Link>
      </div>
    </div>
  );
}
