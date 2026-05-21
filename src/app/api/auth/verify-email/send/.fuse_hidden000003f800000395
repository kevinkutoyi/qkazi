import { NextResponse } from "next/server";
import { z } from "zod";
import { VerificationTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-utils";
import { issueToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/verify-email/send  { email }
 * Issues a fresh verification token and emails it. We always return success
 * to avoid leaking which emails are registered.
 */
export async function POST(req: Request) {
  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    try {
      const token = await issueToken(
        user.id,
        VerificationTokenType.EMAIL_VERIFY,
      );
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token,
      });
    } catch (err) {
      console.error("[resend-verify] failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
