import { ok } from "@/lib/supabase/api";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/account/server";

/**
 * The signed-in user, or null. Validated against the auth server, not just decoded from the
 * cookie. Also what book-spa's booking prefill reads through the same-origin proxy — the fields
 * returned here are a deliberate hand-written allow-list in getAuthUser/toAuthUser, never a raw
 * spread of the profiles row.
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  if (!supabase) return ok(null);
  const { data } = await supabase.auth.getUser();
  return ok(data.user ? await getAuthUser(data.user) : null);
}
