import type { TaskerProfile } from "@prisma/client";

export interface ProfileCompletenessInput {
  photoUrl?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  location?: string | null;
  skills?: string[] | null;
  idFrontUrl?: string | null;
  selfieUrl?: string | null;
}

const REQUIRED: (keyof ProfileCompletenessInput)[] = [
  "photoUrl",
  "bio",
  "hourlyRate",
  "location",
  "skills",
  "idFrontUrl",
  "selfieUrl",
];

function isFilled(
  key: keyof ProfileCompletenessInput,
  p: ProfileCompletenessInput,
): boolean {
  const v = p[key];
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return v > 0;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

export function profileCompleteness(
  p: ProfileCompletenessInput | null | undefined,
): { complete: boolean; filled: number; total: number; percent: number } {
  const total = REQUIRED.length;
  if (!p) return { complete: false, filled: 0, total, percent: 0 };
  const filled = REQUIRED.reduce(
    (n, k) => n + (isFilled(k, p) ? 1 : 0),
    0,
  );
  return {
    complete: filled === total,
    filled,
    total,
    percent: Math.round((filled / total) * 100),
  };
}

export function isProfileComplete(p: TaskerProfile | null | undefined): boolean {
  return profileCompleteness(p).complete;
}
