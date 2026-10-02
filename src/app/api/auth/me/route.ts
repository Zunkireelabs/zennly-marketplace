import { ok, toAuthUser } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";

/** The signed-in user, or null. Validated against the auth server, not just decoded from the cookie. */
export async function GET() {
  const supabase = await createSupabaseServer();
  if (!supabase) return ok(null);
  const { data } = await supabase.auth.getUser();
  return ok(data.user ? toAuthUser(data.user) : null);
}
