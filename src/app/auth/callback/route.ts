import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/account/server";
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
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const supabase = await createSupabaseServer();
  if (!code || !supabase) return NextResponse.redirect(new URL("/?login=failed", origin));

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (data?.user) await ensureProfile(data.user);
  return NextResponse.redirect(new URL(error ? "/?login=failed" : next, origin));
}
