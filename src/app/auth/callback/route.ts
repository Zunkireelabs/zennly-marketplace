import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/account/server";
import { safeNext } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Google sends people back here with a one-time code, which becomes the session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const supabase = await createSupabaseServer();
  if (!code || !supabase) return NextResponse.redirect(new URL("/?login=failed", origin));

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (data?.user) await ensureProfile(data.user);
  return NextResponse.redirect(new URL(error ? "/?login=failed" : next, origin));
}
