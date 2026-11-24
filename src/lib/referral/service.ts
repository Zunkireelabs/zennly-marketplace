import { randomInt } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode } from "./code";

/**
 * Referral rules, v1. A signed-in person gets a personal invite code; a friend who arrives on
 * `/?ref=<code>` and signs up is recorded against it; when that friend's first booking is created,
 * the referrer earns a reward. The reward is a free extra at a participating studio, sent by hand
 * by the Zennly team (`rewardedAt` is set by hand), so nothing here moves money.
 *
 * Takes the database client as an argument so the same code runs in the app and in the tests.
 * Nothing in here may throw into a caller that is doing something more important (a booking).
 */

/** Only a newly made account can be "referred": an existing customer cannot claim a friend's code. */
export const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type Db = Pick<PrismaClient, "referralCode" | "referral" | "profile">;

export function makeCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export { normalizeCode };

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/** The person's invite code, made the first time it is asked for. */
export async function getOrCreateCode(db: Db, userId: string): Promise<string> {
  const existing = await db.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return (await db.referralCode.create({ data: { userId, code: makeCode() } })).code;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Either this person's row appeared a moment ago (two tabs), or the code collided: look again.
      const now = await db.referralCode.findUnique({ where: { userId } });
      if (now) return now.code;
    }
  }
  throw new Error("could not allocate a referral code");
}

export type ClaimResult = "claimed" | "invalid" | "self" | "already" | "too_old";

/** Records that `userId` signed up through someone's invite code. Safe to call more than once. */
export async function claimReferral(db: Db, input: { code: unknown; userId: string; now?: Date }): Promise<ClaimResult> {
  const code = normalizeCode(input.code);
  if (!code) return "invalid";
  const owner = await db.referralCode.findUnique({ where: { code } });
  if (!owner) return "invalid";
  if (owner.userId === input.userId) return "self";

  const profile = await db.profile.findUnique({ where: { id: input.userId }, select: { createdAt: true } });
  const now = (input.now ?? new Date()).getTime();
  if (profile && now - profile.createdAt.getTime() > NEW_ACCOUNT_WINDOW_MS) return "too_old";

  try {
    await db.referral.create({ data: { referrerId: owner.userId, referredId: input.userId, code } });
    return "claimed";
  } catch (e) {
    if (isUniqueViolation(e)) return "already";
    throw e;
  }
}

/** Called when a booking is created: the referred friend's first booking is what earns the reward. */
export async function markFirstBooking(db: Db, userId: string, now = new Date()): Promise<number> {
  const { count } = await db.referral.updateMany({ where: { referredId: userId, bookedAt: null }, data: { bookedAt: now } });
  return count;
}

export type ReferralSummary = {
  code: string;
  /** Friends who signed up through this person's link. */
  signedUp: number;
  /** Of those, friends who have made their first booking. */
  booked: number;
  /** Rewards earned and not yet sent. */
  rewardsDue: number;
  /** Rewards the Zennly team has sent. */
  rewardsSent: number;
};

export async function referralSummary(db: Db, userId: string): Promise<ReferralSummary> {
  const code = await getOrCreateCode(db, userId);
  const rows = await db.referral.findMany({ where: { referrerId: userId }, select: { bookedAt: true, rewardedAt: true } });
  const booked = rows.filter((r) => r.bookedAt);
  return {
    code,
    signedUp: rows.length,
    booked: booked.length,
    rewardsDue: booked.filter((r) => !r.rewardedAt).length,
    rewardsSent: booked.filter((r) => r.rewardedAt).length,
  };
}
