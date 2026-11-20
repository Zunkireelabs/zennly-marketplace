import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin, safeNext } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Starts Google sign-in: Supabase builds the Google URL and stores the PKCE verifier in a cookie. */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const supabase = await createSupabaseServer();
  if (!supabase) return NextResponse.redirect(new URL("/?login=unavailable", requestOrigin(request)));

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/?login=failed", requestOrigin(request)));
  return NextResponse.redirect(data.url);
}
