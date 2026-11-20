import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/account/server";
import { NEXT_COOKIE } from "@/app/api/auth/google/route";
import { requestOrigin, safeNext } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Google sends people back here with a one-time code, which becomes the session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // The host the browser actually came back to, not nextUrl.origin — which reports the hostname
  // `next dev` booted with. Signing in from a phone on the LAN completed the Google exchange and
  // then redirected that phone to http://localhost:3001, i.e. to itself, where nothing is
  // listening: a successful sign-in that ends in ERR_CONNECTION_REFUSED. Same root cause as the
  // CSRF guard in lib/supabase/api.ts; missed here the first time because this destructures
  // `origin` off nextUrl rather than spelling out `nextUrl.origin`.
  const origin = requestOrigin(request);
  // Set before the trip to Google rather than passed through the callback URL — see NEXT_COOKIE.
  // `safeNext` again on the way out: a cookie is as untrusted as a query param.
  const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value ?? null);
  const code = searchParams.get("code");
  const supabase = await createSupabaseServer();
  if (!code || !supabase) return NextResponse.redirect(new URL("/?login=failed", origin));

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Worth a line in the log: from the outside this is indistinguishable from "no code at all",
    // and the two have completely different causes (a stale/replayed code vs a misrouted return).
    console.error("[auth/callback] exchangeCodeForSession failed:", error.status, error.code, error.message);
  }
  if (data?.user) await ensureProfile(data.user);

  const response = NextResponse.redirect(new URL(error ? "/?login=failed" : next, origin));
  response.cookies.delete(NEXT_COOKIE);
  return response;
}
