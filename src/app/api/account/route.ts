import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/account/server";
import { prisma } from "@/lib/prisma";
import { isSameOriginJson, noStore } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/**
 * Deletes the signed-in user's account: marketplace rows first, then the auth user. Needs
 * SUPABASE_SERVICE_ROLE_KEY (server only, never NEXT_PUBLIC_). Bookings live in the engine and are
 * not touched here.
 */
export async function DELETE(request: NextRequest) {
  if (!isSameOriginJson(request)) return json({ ok: false }, 403);
  const user = await getSessionUser();
  if (!user) return json({ ok: false }, 401);
  const config = supabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!prisma || !config || !serviceKey) return json({ ok: false }, 503);

  await prisma.$transaction([
    prisma.savedStudio.deleteMany({ where: { userId: user.id } }),
    prisma.consent.deleteMany({ where: { userId: user.id } }),
    prisma.event.deleteMany({ where: { userId: user.id } }),
    prisma.profile.deleteMany({ where: { id: user.id } }),
  ]);

  const admin = createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ ok: false }, 502);

  await (await createSupabaseServer())?.auth.signOut();
  return json({ ok: true });
}
