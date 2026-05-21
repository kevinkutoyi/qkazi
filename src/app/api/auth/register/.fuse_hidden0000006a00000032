import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, VerificationTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { parseBody } from "@/lib/api-utils";
import { issueToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mailer";

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(80),
    role: z.nativeEnum(Role),
    // Optional initial tasker fields
    hourlyRate: z.number().int().positive().optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.role !== Role.TASKER || typeof data.hourlyRate === "number",
    {
      message: "Taskers must provide an hourlyRate",
      path: ["hourlyRate"],
    },
  );

export async function POST(req: Request) {
  const parsed = await parseBody(req, registerSchema);
  if ("error" in parsed) return parsed.error;
  const { email, password, name, role, hourlyRate, location, bio, skills } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      // emailVerified intentionally null — the user must confirm via email.
      taskerProfile:
        role === Role.TASKER
          ? {
              create: {
                hourlyRate: hourlyRate!,
                location: location ?? null,
                bio: bio ?? null,
                skills: skills ?? [],
              },
            }
          : undefined,
    },
  });

  // Issue a verification token and email it. We don't set a session cookie:
  // login is blocked until the user confirms their address.
  try {
    const token = await issueToken(user.id, VerificationTokenType.EMAIL_VERIFY);
    await sendVerificationEmail({ to: user.email, name: user.name, token });
  } catch (err) {
    console.error("[register] verification email failed:", err);
    // Still return success — the user can request a resend from /verify-email.
  }

  return NextResponse.json({
    ok: true,
    message: "Account created. Check your email to confirm your address.",
    email: user.email,
  });
}
