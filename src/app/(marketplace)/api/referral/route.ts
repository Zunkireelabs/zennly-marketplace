import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { referralSummary } from "@/lib/referral/service";
import { noStore } from "@/lib/supabase/api";

/** The signed-in person's invite code and how their invites are going. Only ever their own. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  if (!prisma) return NextResponse.json({ ok: false }, { status: 503, headers: noStore });
  try {
    return NextResponse.json({ ok: true, ...(await referralSummary(prisma, user.id)) }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500, headers: noStore });
  }
}
