import { NextResponse } from "next/server";
import { z } from "zod";
import { VerificationTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { parseBody } from "@/lib/api-utils";
import { consumeToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

/**
 * POST /api/auth/password-reset/confirm  { token, password }
 * Consumes the reset token and sets a new password. Also marks the email
 * as verified — receiving the reset email proves control of the inbox.
 */
export async function POST(req: Request) {
  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { token, password } = parsed.data;

  const result = await consumeToken(
    token,
    VerificationTokenType.PASSWORD_RESET,
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "expired"
            ? "This reset link has expired. Request a new one."
            : "This reset link is invalid.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: result.userId },
    data: {
      passwordHash,
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
