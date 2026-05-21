import { NextResponse } from "next/server";
import { z } from "zod";
import { VerificationTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-utils";
import { issueToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/password-reset  { email }
 * Sends a password-reset email if the account exists and has a password.
 * Always returns success to prevent account enumeration.
 */
export async function POST(req: Request) {
  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Skip reset for Google-only accounts (no password to reset).
  if (user && user.passwordHash) {
    try {
      const token = await issueToken(
        user.id,
        VerificationTokenType.PASSWORD_RESET,
      );
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token,
      });
    } catch (err) {
      console.error("[password-reset] failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
