import { randomBytes } from "crypto";
import { VerificationTokenType } from "@prisma/client";
import { prisma } from "./prisma";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; //  1 hour

function generateToken(): string {
  // 32 bytes → 43 chars base64url, plenty of entropy.
  return randomBytes(32).toString("base64url");
}

function ttlFor(type: VerificationTokenType): number {
  switch (type) {
    case VerificationTokenType.EMAIL_VERIFY:
      return EMAIL_VERIFY_TTL_MS;
    case VerificationTokenType.PASSWORD_RESET:
      return PASSWORD_RESET_TTL_MS;
  }
}

/**
 * Issue a new single-use token for the user. Any prior tokens of the same
 * type are invalidated so a fresh email link supersedes the previous one.
 */
export async function issueToken(
  userId: string,
  type: VerificationTokenType,
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlFor(type));
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId, type } }),
    prisma.verificationToken.create({
      data: { userId, type, token, expiresAt },
    }),
  ]);
  return token;
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "expired" };

/**
 * Atomically consume a token. Returns the associated userId on success.
 * The token row is deleted whether expired or used so it can't be reused.
 */
export async function consumeToken(
  token: string,
  type: VerificationTokenType,
): Promise<ConsumeResult> {
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.type !== type) return { ok: false, reason: "not_found" };

  // Always delete — used or expired, the token is now invalid.
  await prisma.verificationToken
    .delete({ where: { token } })
    .catch(() => undefined);

  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, userId: row.userId };
}
