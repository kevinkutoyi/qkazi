import { NextResponse } from "next/server";
import { VerificationTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * GET /api/auth/verify-email?token=...
 * Consumes a verification token and marks the user's email as verified.
 * Redirects to /login on success, or /verify-email/confirm with an error param.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    const url = new URL("/verify-email/confirm", appUrl());
    url.searchParams.set("error", "missing");
    return NextResponse.redirect(url);
  }

  const result = await consumeToken(token, VerificationTokenType.EMAIL_VERIFY);
  if (!result.ok) {
    const url = new URL("/verify-email/confirm", appUrl());
    url.searchParams.set("error", result.reason);
    return NextResponse.redirect(url);
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerified: new Date() },
  });

  const url = new URL("/login", appUrl());
  url.searchParams.set("verified", "1");
  return NextResponse.redirect(url);
}
