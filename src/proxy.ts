import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS, supabaseConfig } from "@/lib/supabase/config";

/** Keeps the Supabase session fresh: refreshes expiring tokens and writes them back as httpOnly cookies. */
export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS });
        }
      },
    },
  });

  // Validates with the auth server and triggers the refresh. Do not remove.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|videos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)"],
};
