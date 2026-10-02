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

export function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : undefined;
  return {
    id: user.id,
    email: user.email ?? undefined,
    name,
    phoneVerified: false,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

/** Only same-site relative paths, so `next` can't become an open redirect. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
