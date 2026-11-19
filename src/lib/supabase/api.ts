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
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return false;
  return (request.headers.get("content-type") ?? "").startsWith("application/json");
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
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: profile?.name ?? metaName,
    firstName: profile?.firstName ?? undefined,
    lastName: profile?.lastName ?? undefined,
    phone: profile?.phone ?? undefined,
    gender: profile?.gender ?? undefined,
    country: profile?.country ?? undefined,
    // Always false until phone verification exists (no SMS provider yet) — but now for a real
    // reason (profile.phoneVerifiedAt is always null today) rather than a hardcoded stub.
    phoneVerified: Boolean(profile?.phoneVerifiedAt),
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

/** The subset of the Profile row toAuthUser reads — kept narrow so this file stays DB-type-free. */
export type ProfileLike = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  gender: string | null;
  country: string | null;
  phoneVerifiedAt: Date | null;
};

/** Only same-site relative paths, so `next` can't become an open redirect. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
