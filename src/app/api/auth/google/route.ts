import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin, safeNext } from "@/lib/supabase/api";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Where to land after signing in, carried in a cookie rather than in the callback's query string.
 *
 * Supabase matches `redirect_to` against the dashboard's Redirect URLs allow list, and a wildcard
 * entry does not cover a query string — so `.../auth/callback?next=%2F` failed to match
 * `http://host/**`, and Supabase silently fell back to the project's Site URL. That stayed
 * invisible in development because the Site URL *is* http://localhost:3001: a failed match still
 * landed in the right place. The moment the app was opened on a LAN IP, the same failed match sent
 * the phone to localhost — itself — and sign-in ended at ERR_CONNECTION_REFUSED.
 *
 * A bare callback URL matches any sensible allow-list entry, which makes this robust about whatever
 * host the app is reached on — a deploy preview, a tunnel, a teammate's phone — instead of needing
 * one allow-list line per URL shape. It also keeps the post-login destination out of the URL that
 * Google and Supabase both log.
 */
export const NEXT_COOKIE = "zennly-oauth-next";

/** Starts Google sign-in: Supabase builds the Google URL and stores the PKCE verifier in a cookie. */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const supabase = await createSupabaseServer();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin(request);
  if (!supabase) return NextResponse.redirect(new URL("/?login=unavailable", origin));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/?login=failed", origin));

  const response = NextResponse.redirect(data.url);
  // SameSite=Lax is enough: the return trip is a top-level GET navigation, which Lax allows.
  // Short-lived — this is in flight only for as long as the Google consent screen is open.
  response.cookies.set(NEXT_COOKIE, next, { ...SESSION_COOKIE_OPTIONS, maxAge: 600 });
  return response;
}
