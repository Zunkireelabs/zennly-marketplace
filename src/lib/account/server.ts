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
      select: {
        name: true,
        firstName: true,
        lastName: true,
        avatarProvider: true,
        avatarUploaded: true,
        phone: true,
        gender: true,
        country: true,
        dob: true,
        phoneVerifiedAt: true,
      },
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

/**
 * Creates the profile row on first sign-in. On every later sign-in, also fills any still-empty
 * name fields and refreshes avatarProvider from whatever the auth provider offers THIS time —
 * not just at creation.
 *
 * Why it can't stay create-only: verified against a real Google sign-in (2026-11 — see PR
 * discussion) that an account created by email-OTP, which later links Google, never picks up
 * Google's name/avatar at all: `exists` is true from the email-OTP row, so the old create-only
 * version returned immediately and the metadata was simply never read. Email-first is this app's
 * default path (OTP shipped long before Google sign-in), so this wasn't an edge case.
 *
 * Google's OIDC passthrough was also confirmed NOT to include given_name/family_name — only
 * name/full_name. So firstName/lastName stay null whenever a provider doesn't send the split
 * fields; they are deliberately NEVER derived by splitting full_name/name on a space. A null first
 * name is honest and the /account edit form (M4) exists precisely so the customer can fill it in;
 * a wrong guess from splitting is worse, because it silently flows into every booking afterward
 * with nothing to flag it as wrong.
 *
 * This function writes avatarProvider ONLY — NEVER avatarUploaded, under any circumstance. That
 * split is what makes "a customer's own upload can never be overwritten by signing in" a
 * structural fact rather than a rule this function has to remember to honor. A later refactor
 * that "simplifies" these two fields back into one would silently reintroduce exactly the bug
 * (Google's photo stomping a user's own upload) the split exists to prevent.
 */
export async function ensureProfile(user: User): Promise<void> {
  if (!prisma) return;
  const meta = user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : null);
  const firstName = str(meta.given_name);
  const lastName = str(meta.family_name);
  const name = deriveDisplayName(firstName, lastName) ?? str(meta.full_name) ?? str(meta.name);
  const avatarProvider = str(meta.avatar_url);

  const exists = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!exists) {
    await prisma.profile
      .create({ data: { id: user.id, name, firstName, lastName, avatarProvider } })
      .catch(() => {}); // lost a race with a parallel first sign-in: the row exists, which is the goal
    return;
  }

  // Nothing this sign-in's metadata can offer (the common case: a plain email-OTP re-login) —
  // skip the write entirely rather than issuing a no-op UPDATE every single sign-in.
  if (name === null && firstName === null && lastName === null && avatarProvider === null) return;

  // name/firstName/lastName: fill-only-null, enforced in SQL via COALESCE(column, new) rather
  // than read-then-write, so "never overwrite a value the customer already has or set" is
  // structural — same rule and reason as the booking backfill (§F of the profile plan).
  //
  // avatarProvider: the OPPOSITE direction, COALESCE(new, column) — prefer the freshly-offered
  // value, fall back to what's already stored. This one is allowed to change on every sign-in,
  // deliberately: it's entirely provider-managed (never a customer edit, see the avatarUploaded
  // doc comment in schema.prisma), and Google's photo URLs are not permanently stable — a Google
  // sign-in with no incoming avatar_url this time must not blank out a previously-stored one, but
  // one WITH a URL should always win, since that's the provider telling us the current photo.
  //
  // Raw SQL bypasses Prisma's @updatedAt handling, which is deliberate here: a passive metadata
  // backfill isn't a customer edit, and bumping `updated_at` for it would be a false signal.
  //
  // This path is NOT wrapped in a silent catch like the create path above — that's correct for a
  // create racing another create, but a silently-swallowed failure here is exactly how this bug
  // (an existing account's Google name/avatar never arriving) stayed invisible in the first place.
  await prisma.$executeRaw`
    UPDATE profiles SET
      name = COALESCE(name, ${name}),
      first_name = COALESCE(first_name, ${firstName}),
      last_name = COALESCE(last_name, ${lastName}),
      avatar_provider = COALESCE(${avatarProvider}, avatar_provider)
    WHERE id = ${user.id}
  `.catch((err: unknown) => {
    console.error("[ensureProfile] failed to backfill existing profile from auth metadata", user.id, err);
  });
}
