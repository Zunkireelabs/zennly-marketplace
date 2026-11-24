import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS, supabaseConfig } from "@/lib/supabase/config";
import { isPortedBusinessesPath } from "@/lib/businesses-ported";

const BUSINESSES_PREFIX = "/businesses";
/** Where `public/` lives at runtime — the repo root in dev, the standalone dir in a container. */
const PUBLIC_DIR = path.join(process.cwd(), "public");
const BUSINESSES_404 = `${BUSINESSES_PREFIX}/404.html`;

/** Resolves a root-absolute URL path to a file inside public/, or null if it escapes public/. */
function publicFilePath(urlPath: string): string | null {
  const resolved = path.resolve(PUBLIC_DIR, `.${urlPath}`);
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) return null;
  return resolved;
}

function mirroredFile(urlPath: string): string | null {
  const file = publicFilePath(urlPath);
  return file && existsSync(file) ? file : null;
}

/**
 * web-zenly's Eleventy build writes `foo/index.html` for every clean URL (e.g. `/pricing`
 * becomes `_site/pricing/index.html`). The mirrored copy under `public/businesses/` keeps
 * that same shape, but Next's static file serving only resolves exact paths — it won't
 * append `index.html` the way a plain static server does. This rewrites extension-less
 * requests under /businesses to their mirrored index.html.
 *
 * Returns a response for every path under /businesses, so nothing in this section reaches
 * the Supabase block below:
 *   - extensioned paths (css/js/woff2/images/...) pass straight through to public/, with no
 *     auth round-trip per asset — base.njk alone pulls 7 of them per marketing page;
 *   - a miss serves the mirrored public/businesses/404.html, so a bad marketing URL keeps
 *     marketing chrome instead of rendering the marketplace's not-found.tsx.
 */
function handleBusinessesPath(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname !== BUSINESSES_PREFIX && !pathname.startsWith(`${BUSINESSES_PREFIX}/`)) return null;

  // Ported pages are real Next routes: pass through (still never reaching the Supabase block below).
  if (isPortedBusinessesPath(pathname)) return NextResponse.next();

  const hasExtension = /\.[^/.]+$/.test(pathname);
  if (hasExtension) return NextResponse.next();

  const relative = pathname.slice(BUSINESSES_PREFIX.length).replace(/\/$/, "");
  const target = `${BUSINESSES_PREFIX}${relative}/index.html`;
  if (mirroredFile(target)) return NextResponse.rewrite(new URL(target, request.url));

  // Rewriting to 404.html would serve it as a 200 soft 404, so read it and set the status
  // ourselves. If the mirror isn't there at all, fall through to Next's own not-found.
  const notFound = mirroredFile(BUSINESSES_404);
  if (!notFound) return NextResponse.rewrite(new URL(target, request.url));
  return new NextResponse(readFileSync(notFound, "utf8"), {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * An OAuth code that lands on the site root instead of /auth/callback, forwarded to the route that
 * knows how to spend it.
 *
 * Supabase only uses the `redirect_to` we send if it matches the dashboard's Redirect URLs; when
 * it doesn't, it silently substitutes the project's Site URL — the bare origin, callback path
 * discarded — and the one-time code arrives at `/?code=…`, where nothing was listening. The
 * account page then showed a signed-out visitor holding a valid code.
 *
 * Verified against `auth.flow_state.referrer`, which records the return address GoTrue actually
 * accepted: every row for this project reads the Site URL, including attempts whose `redirect_to`
 * exactly equalled an allow-list entry. So the substitution is not an edge case here, it is the
 * normal path, and the allow list cannot be relied on to prevent it.
 *
 * Cheap to be right about: one `has("code")` check on one pathname, and it makes sign-in work
 * whichever address Supabase picks rather than requiring the dashboard to agree with the code.
 */
function handleRootOAuthCode(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/" || !searchParams.has("code")) return null;
  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url);
}

/** Keeps the Supabase session fresh: refreshes expiring tokens and writes them back as httpOnly cookies. */
export async function proxy(request: NextRequest) {
  const businessesResponse = handleBusinessesPath(request);
  if (businessesResponse) return businessesResponse;

  const oauthResponse = handleRootOAuthCode(request);
  if (oauthResponse) return oauthResponse;

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
