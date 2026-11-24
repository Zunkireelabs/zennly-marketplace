import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { claimReferral } from "@/lib/referral/service";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";

const Body = z.object({ code: z.string().max(40) });

/**
 * Records that the signed-in person came through a friend's invite link. Called by the browser
 * once, right after sign-in. The answer says what happened but never errors the page: a failed
 * referral must not get in the way of someone signing up.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success || !prisma) return NextResponse.json({ ok: false }, { status: 400, headers: noStore });
  try {
    const result = await claimReferral(prisma, { code: body.data.code, userId: user.id });
    return NextResponse.json({ ok: true, result }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500, headers: noStore });
  }
}
