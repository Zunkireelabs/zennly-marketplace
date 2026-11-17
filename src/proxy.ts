import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS, supabaseConfig } from "@/lib/supabase/config";

const BUSINESSES_PREFIX = "/businesses";

/**
 * web-zenly's Eleventy build writes `foo/index.html` for every clean URL (e.g. `/pricing`
 * becomes `_site/pricing/index.html`). The mirrored copy under `public/businesses/` keeps
 * that same shape, but Next's static file serving only resolves exact paths — it won't
 * append `index.html` the way a plain static server does. This rewrites extension-less
 * requests under /businesses to their mirrored index.html; requests that already carry a
 * file extension (css/js/images/etc.) are left alone so the filesystem route in public/
 * serves them directly.
 */
function rewriteBusinessesPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname !== BUSINESSES_PREFIX && !pathname.startsWith(`${BUSINESSES_PREFIX}/`)) return null;

  const hasExtension = /\.[^/.]+$/.test(pathname);
  if (hasExtension) return null;

  const relative = pathname.slice(BUSINESSES_PREFIX.length).replace(/\/$/, "");
  const target = `${BUSINESSES_PREFIX}${relative}/index.html`;
  return NextResponse.rewrite(new URL(target, request.url));
}

/** Keeps the Supabase session fresh: refreshes expiring tokens and writes them back as httpOnly cookies. */
export async function proxy(request: NextRequest) {
  const businessesRewrite = rewriteBusinessesPath(request);
  if (businessesRewrite) return businessesRewrite;

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
