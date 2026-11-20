import "server-only";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthError, AuthUser } from "@/lib/auth/types";

export const noStore = { "Cache-Control": "no-store" };

export function fail(error: AuthError, status: number) {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { headers: noStore });
}

export const notConfigured = () =>
  fail({ code: "unavailable", message: "Sign in isn't available yet." }, 503);

/**
 * CSRF guard for state-changing routes: the request must come from our own origin and be JSON
 * (a cross-site form post can't send either). Session cookies are also SameSite=Lax.
 */
export function isSameOriginJson(request: NextRequest): boolean {
  return isSameOrigin(request) && (request.headers.get("content-type") ?? "").startsWith("application/json");
}

/**
 * Same CSRF guard as isSameOriginJson, minus the JSON requirement — for state-changing routes
 * that take a body a cross-site form CAN send a version of (multipart/form-data, e.g. the avatar
 * upload route), where Origin is the only thing actually proving same-site intent.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin) && origin === request.nextUrl.origin;
}

/**
 * Pure and synchronous on purpose — no DB access, despite living in a "server-only" file. The
 * `profiles` row (when passed) wins over Supabase auth metadata for every field it has, because
 * metadata is writable by anyone holding the access token and can never be authoritative for
 * something like `phoneVerified`, and because it's baked into the JWT so an edit isn't visible
 * until the token refreshes. Metadata stays the fallback — not removed — so a user whose
 * `ensureProfile` lost a race (row doesn't exist yet) still renders with a name from Google.
 */
export function toAuthUser(user: User, profile?: ProfileLike | null): AuthUser {
  const meta = user.user_metadata ?? {};
  const metaName =
    typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : undefined;
  const metaAvatar = typeof meta.avatar_url === "string" ? meta.avatar_url : undefined;
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: profile?.name ?? metaName,
    firstName: profile?.firstName ?? undefined,
    lastName: profile?.lastName ?? undefined,
    // The ONE place avatarUploaded/avatarProvider precedence is decided — consumers (including
    // book-spa's marketplaceIdentity.js) get a single resolved URL or undefined, never the two
    // columns, and never have to implement "which photo wins" themselves. A customer's own
    // upload always wins over the provider's photo; metaAvatar is the final fallback only for a
    // user whose ensureProfile hasn't run yet (profile is null — same race-lost reasoning as
    // `name` above). Currently this is almost always Google's lh3.googleusercontent.com URL,
    // rendered as a hotlink (every page view requests it from Google, carrying the visitor's
    // IP/referrer) rather than copied into our own storage — a deliberate choice to revisit once
    // avatar-upload storage exists, at which point copying provider photos in at sign-in becomes
    // the better default for privacy and URL durability. Independent of avatarUploaded either way.
    avatar: profile?.avatarUploaded ?? profile?.avatarProvider ?? metaAvatar,
    phone: profile?.phone ?? undefined,
    gender: profile?.gender ?? undefined,
    country: profile?.country ?? undefined,
    // YYYY-MM-DD, not a Date: toISOString() would shift by timezone and risk sliding onto the
    // wrong calendar day; slicing the already-date-only column's ISO string never can.
    dob: profile?.dob ? profile.dob.toISOString().slice(0, 10) : undefined,
    // Always false until phone verification exists (no SMS provider yet) — but now for a real
    // reason (profile.phoneVerifiedAt is always null today) rather than a hardcoded stub.
    phoneVerified: Boolean(profile?.phoneVerifiedAt),
    emailVerified: Boolean(user.email_confirmed_at),
    // An email change this customer started but hasn't finished. Supabase owns this state, so it
    // is NOT mirrored into a column of ours: a copy would desync on abandoned flows, expired
    // tokens, and codes confirmed in another tab, with nothing to reconcile it. Read straight off
    // the auth user instead — `getUser()` already fetches it.
    //
    // This is what makes the change-email dialog survive a reload or a different device: the
    // per-LEG progress (which of the two codes is already spent) is genuinely not exposed by
    // GoTrue anywhere, so the only honest recovery is "a change to THIS address is pending" plus a
    // Start-over that reissues both codes. Browser storage would claim to know more than we do and
    // would be absent on another device anyway.
    pendingEmail: user.new_email ?? undefined,
  };
}

/** The subset of the Profile row toAuthUser reads — kept narrow so this file stays DB-type-free. */
export type ProfileLike = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarProvider: string | null;
  avatarUploaded: string | null;
  phone: string | null;
  gender: string | null;
  country: string | null;
  dob: Date | null;
  phoneVerifiedAt: Date | null;
};

/** Only same-site relative paths, so `next` can't become an open redirect. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
