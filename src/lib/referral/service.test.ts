import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { claimReferral, getOrCreateCode, makeCode, markFirstBooking, NEW_ACCOUNT_WINDOW_MS, normalizeCode, referralSummary } from "./service";

describe("invite codes", () => {
  it("makes 8-character codes with no look-alike characters", () => {
    for (let i = 0; i < 200; i++) expect(makeCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });
  it("accepts a code typed in lower case with spaces, and rejects anything else", () => {
    expect(normalizeCode("  abcd2345 ")).toBe("ABCD2345");
    for (const bad of ["", "ABC", "ABCD234O", "ABCD23456", null, undefined, 12345678, { code: "ABCD2345" }]) expect(normalizeCode(bad)).toBeNull();
  });
});

// The rules below run against a real Postgres. Set TEST_DATABASE_URL to an empty throwaway database
// that has the schema (npx prisma db push). Never point it at a shared or live database: it deletes
// rows. Skipped when unset, so the normal test run needs no database.
const url = process.env.TEST_DATABASE_URL;
const real = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) }) : null;

const A = "11111111-1111-4111-8111-111111111111"; // the referrer
const B = "22222222-2222-4222-8222-222222222222"; // the friend
const C = "33333333-3333-4333-8333-333333333333"; // another friend

describe.skipIf(!real)("referral rules (real database)", () => {
  const db = real!;
  beforeEach(async () => {
    await db.referral.deleteMany();
    await db.referralCode.deleteMany();
    await db.profile.deleteMany();
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it("gives a person one code and keeps it", async () => {
    const first = await getOrCreateCode(db, A);
    expect(await getOrCreateCode(db, A)).toBe(first);
    expect(await db.referralCode.count()).toBe(1);
  });

  it("two tabs asking at once still end with one code", async () => {
    const codes = await Promise.all([getOrCreateCode(db, A), getOrCreateCode(db, A), getOrCreateCode(db, A)]);
    expect(new Set(codes).size).toBe(1);
    expect(await db.referralCode.count()).toBe(1);
  });

  it("records a friend who signs up through a code", async () => {
    const code = await getOrCreateCode(db, A);
    expect(await claimReferral(db, { code: code.toLowerCase(), userId: B })).toBe("claimed");
    const row = await db.referral.findUniqueOrThrow({ where: { referredId: B } });
    expect(row.referrerId).toBe(A);
    expect(row.bookedAt).toBeNull();
  });

  it("refuses unknown codes, your own code, and a second referral", async () => {
    const code = await getOrCreateCode(db, A);
    expect(await claimReferral(db, { code: "ZZZZZZZZ", userId: B })).toBe("invalid");
    expect(await claimReferral(db, { code: "nope", userId: B })).toBe("invalid");
    expect(await claimReferral(db, { code, userId: A })).toBe("self");
    expect(await claimReferral(db, { code, userId: B })).toBe("claimed");
    expect(await claimReferral(db, { code, userId: B })).toBe("already");
    // A friend already referred by A cannot be re-referred by someone else.
    const other = await getOrCreateCode(db, C);
    expect(await claimReferral(db, { code: other, userId: B })).toBe("already");
    expect(await db.referral.count()).toBe(1);
  });

  it("refuses an existing customer: only a new account can be referred", async () => {
    const code = await getOrCreateCode(db, A);
    await db.profile.create({ data: { id: B, createdAt: new Date(Date.now() - NEW_ACCOUNT_WINDOW_MS - 60_000) } });
    expect(await claimReferral(db, { code, userId: B })).toBe("too_old");
    await db.profile.create({ data: { id: C } });
    expect(await claimReferral(db, { code, userId: C })).toBe("claimed");
  });

  it("the friend's first booking earns the reward once, and later bookings change nothing", async () => {
    const code = await getOrCreateCode(db, A);
    await claimReferral(db, { code, userId: B });
    expect(await markFirstBooking(db, C)).toBe(0); // someone who was never referred
    const t1 = new Date("2026-12-01T10:00:00Z");
    expect(await markFirstBooking(db, B, t1)).toBe(1);
    expect(await markFirstBooking(db, B, new Date("2026-12-09T10:00:00Z"))).toBe(0);
    expect((await db.referral.findUniqueOrThrow({ where: { referredId: B } })).bookedAt?.toISOString()).toBe(t1.toISOString());
  });

  it("summarises signed-up, booked, due and sent", async () => {
    const code = await getOrCreateCode(db, A);
    await claimReferral(db, { code, userId: B });
    await claimReferral(db, { code, userId: C });
    await markFirstBooking(db, B);
    expect(await referralSummary(db, A)).toEqual({ code, signedUp: 2, booked: 1, rewardsDue: 1, rewardsSent: 0 });
    await db.referral.update({ where: { referredId: B }, data: { rewardedAt: new Date() } });
    expect(await referralSummary(db, A)).toMatchObject({ signedUp: 2, booked: 1, rewardsDue: 0, rewardsSent: 1 });
  });
});

describe.skipIf(!real)("deleting an account removes its referral rows (real database)", () => {
  const db = real!;
  it("clears the person's code and every referral they are on either side of, and leaves others", async () => {
    await db.referral.deleteMany();
    await db.referralCode.deleteMany();
    const codeA = await getOrCreateCode(db, A);
    const codeC = await getOrCreateCode(db, C);
    await claimReferral(db, { code: codeA, userId: B }); // A invited B
    await claimReferral(db, { code: codeC, userId: "44444444-4444-4444-8444-444444444444" }); // C invited someone else
    // The same two statements the delete-account route runs for user A.
    await db.$transaction([
      db.referralCode.deleteMany({ where: { userId: A } }),
      db.referral.deleteMany({ where: { OR: [{ referrerId: A }, { referredId: A }] } }),
    ]);
    expect(await db.referralCode.findUnique({ where: { userId: A } })).toBeNull();
    expect(await db.referral.count({ where: { referrerId: A } })).toBe(0);
    expect(await db.referral.count()).toBe(1); // C's invite is untouched
    expect(await db.referralCode.findUnique({ where: { userId: C } })).not.toBeNull();
  });
});
