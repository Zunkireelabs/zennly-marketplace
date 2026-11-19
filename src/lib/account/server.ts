import "server-only";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";
import { toAuthUser } from "@/lib/supabase/api";
import type { AuthUser } from "@/lib/auth/types";

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

/**
 * The AuthUser this session's own edits actually show up in — toAuthUser(user) alone only ever
 * reflects Supabase auth metadata, which profile edits never touch. This is the one place that
 * reads the `profiles` row and hands it to toAuthUser as the override.
 *
 * `.catch(() => null)` is deliberate, not defensive filler: this sits on the critical path for
 * both `/api/auth/me` (marketplace nav) and book-spa's booking prefill through the same route.
 * A DB blip here must degrade to today's metadata-only AuthUser, never a 500.
 */
export async function getAuthUser(user: User): Promise<AuthUser> {
  if (!prisma) return toAuthUser(user);
  const profile = await prisma.profile
    .findUnique({
      where: { id: user.id },
      select: { name: true, firstName: true, lastName: true, phone: true, gender: true, country: true, phoneVerifiedAt: true },
    })
    .catch(() => null);
  return toAuthUser(user, profile);
}

/**
 * `name` is a derived display string, never edited directly — recomputed from firstName/lastName
 * on every write so it stays in sync for the /api/auth/me consumers that still read it. Splitting
 * a full name on a space is lossy for Nepali names (single-word given names, multi-word
 * surnames), which is exactly why this function exists instead of `.split(" ")` at call sites.
 */
export function deriveDisplayName(firstName: string | null, lastName: string | null): string | null {
  const joined = [firstName, lastName].filter(Boolean).join(" ");
  return joined.length > 0 ? joined : null;
}

/** Creates the profile row on first sign-in; a no-op afterwards. */
export async function ensureProfile(user: User): Promise<void> {
  if (!prisma) return;
  const exists = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true } });
  if (exists) return;
  const meta = user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : null);
  // Google's OIDC claims land in user_metadata as given_name/family_name (plus full_name/name) —
  // prefer the split fields over full_name.split(" ") for the same Nepali-name reason as above.
  // Email-OTP signups have none of this; everything here is null and the row is created empty.
  const firstName = str(meta.given_name);
  const lastName = str(meta.family_name);
  const name = deriveDisplayName(firstName, lastName) ?? str(meta.full_name) ?? str(meta.name);
  await prisma.profile
    .create({ data: { id: user.id, name, firstName, lastName, avatar: str(meta.avatar_url) } })
    .catch(() => {}); // lost a race with a parallel first sign-in: the row exists, which is the goal
}
