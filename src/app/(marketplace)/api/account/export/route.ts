import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { noStore } from "@/lib/supabase/api";

/**
 * "Download my data": everything the marketplace itself holds about the signed-in user, as a JSON
 * file. Only ever the session's own rows (userId comes from the verified session, never the URL).
 * Bookings are NOT included: they live in the booking engine and the studio, and the privacy policy
 * says so. A plain GET is fine here: the response is only readable by the signed-in user's own
 * browser, and it changes nothing.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  if (!prisma) return NextResponse.json({ ok: false }, { status: 503, headers: noStore });

  const [profile, saved, consents, events, referralCode, referrals] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id } }),
    prisma.savedStudio.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.consent.findMany({ where: { userId: user.id }, orderBy: { at: "asc" } }),
    prisma.event.findMany({ where: { userId: user.id }, orderBy: { at: "asc" } }),
    prisma.referralCode.findUnique({ where: { userId: user.id } }),
    prisma.referral.findMany({ where: { OR: [{ referrerId: user.id }, { referredId: user.id }] }, orderBy: { createdAt: "asc" } }),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    note: "Data the Zennly marketplace holds about you. Bookings are kept by the booking system and the studio and are not included; email info@zennly.io to ask about them.",
    account: { id: user.id, email: user.email ?? null, createdAt: user.created_at ?? null },
    profile,
    savedStudios: saved,
    consents,
    usageEvents: events,
    referralCode,
    // Only this person's side of each referral: never the other person's account id.
    referrals: referrals.map((r) =>
      r.referrerId === user.id
        ? { role: "referrer", invitedAt: r.createdAt, friendFirstBookingAt: r.bookedAt, rewardSentAt: r.rewardedAt }
        : { role: "referred", joinedAt: r.createdAt, code: r.code },
    ),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      ...noStore,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zennly-my-data.json"',
    },
  });
}
