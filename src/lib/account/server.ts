import "server-only";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * The verified session user (checked with the auth server, never just decoded from the cookie), or
 * null. Every account query takes its user id from here, never from the request body, because
 * Prisma bypasses RLS.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Creates the profile row on first sign-in; a no-op afterwards. */
export async function ensureProfile(user: User): Promise<void> {
  if (!prisma) return;
  const exists = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true } });
  if (exists) return;
  const meta = user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : null);
  await prisma.profile
    .create({ data: { id: user.id, name: str(meta.full_name) ?? str(meta.name), avatar: str(meta.avatar_url) } })
    .catch(() => {}); // lost a race with a parallel first sign-in: the row exists, which is the goal
}
