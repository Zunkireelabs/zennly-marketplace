import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Baseline security headers for every route. A full script-src Content-Security-Policy needs a
// nonce setup and testing against Next's inline scripts, so it comes with real auth in Phase 2;
// the directives below are the ones that cannot break the page.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

// web-zenly's marketing site used to own the root of zennly.io; it now lives under
// /businesses. Both trailing-slash shapes are in the wild — the old sitemap published
// `/pricing/` while web-zenly's own nav linked `/pricing` — and both resolve. Next's
// trailing-slash normalization runs *before* redirects, so `/pricing/` 308s to `/pricing`
// first and then matches the rule below; a rule for the slashed shape would be dead code.
// Verified: both shapes end at /businesses/pricing, the slashed one via one extra hop.
//
// The prefix list used to be a hand-maintained array here. It drifted the first time
// web-zenly added or removed a top-level section (ten sections — compare, contact,
// cookie-policy, daily-close-checklist, faq, feed, global, nepal, press, and more —
// appeared with zero signal here, while how-it-works was deleted and the stale entry
// would have kept 308ing to a page that no longer exists). Deriving it from the actual
// mirrored tree means a new web-zenly section is covered automatically on the next sync,
// with no edit to this file — the same reasoning src/app/sitemap.ts already uses for the
// marketing half of the sitemap.
//
// This reads public/businesses/ synchronously at config-eval time, which depends on the
// mirror already existing on disk. That ordering is guaranteed by npm's script lifecycle,
// not by anything in Next itself: `npm run build` always runs the `prebuild` script (which
// runs scripts/sync-businesses-site.mjs) to completion in its own process *before* starting
// the `build` script (`next build`), which is what loads and evaluates this file. Same for
// `predev` before `next dev`. Verified empirically, not just assumed: deleted
// public/businesses/, ran `npm run build` end-to-end, and confirmed the derived prefix set
// was non-empty and correct in the resulting route table — if the ordering didn't hold, this
// would throw (see the missing-mirror branch below) rather than silently building with zero
// marketing redirects.
function deriveMarketingPrefixes(): string[] {
  const businessesDir = path.join(process.cwd(), "public", "businesses");
  if (!existsSync(businessesDir)) {
    throw new Error(
      "public/businesses/ not found while deriving marketing-site redirect prefixes in " +
        "next.config.ts. This should only happen if next build/dev was invoked without its " +
        "npm script (prebuild/predev runs scripts/sync-businesses-site.mjs first). Run " +
        "`npm run sync:businesses` and retry, or use the npm script instead of calling the " +
        "Next CLI directly."
    );
  }

  // "assets" has its own dedicated rule below (assetRedirect) with its own reasoning —
  // excluded here so it isn't redirected twice.
  const prefixes = readdirSync(businessesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "assets")
    .map((entry) => entry.name);

  // The marketplace owns these top-level segments (plus /businesses itself). If web-zenly
  // ever ships a top-level section with one of these names, a derived redirect would SHADOW
  // a real marketplace route — e.g. a web-zenly "/search" page would silently 308 every
  // search request into the marketing mirror. That is a far worse failure than a 404, and a
  // silent one, so this fails the build loudly instead of skipping or overriding. The sets
  // are disjoint today; this guard is for when that stops being true.
  const reservedByMarketplace = new Set(["api", "auth", "businesses", "collections", "providers", "saved", "search"]);
  const collisions = prefixes.filter((prefix) => reservedByMarketplace.has(prefix));
  if (collisions.length > 0) {
    throw new Error(
      `web-zenly now ships a top-level section (${collisions.join(", ")}) whose name collides ` +
        "with a marketplace route. A derived redirect would shadow that route. Resolve the " +
        "naming collision (rename the web-zenly section, or carve out an exception here) " +
        "before building."
    );
  }

  return prefixes;
}

const MOVED_MARKETING_PREFIXES = deriveMarketingPrefixes();

// `permanent: true` is a 308, not a 301: it is the permanent redirect that preserves the
// request method. Search engines treat it the same as a 301 for canonicalization.
const marketingRedirects = MOVED_MARKETING_PREFIXES.map((prefix) => ({
  source: `/${prefix}/:path*`,
  destination: `/businesses/${prefix}/:path*`,
  permanent: true,
}));

// web-zenly's old build referenced its own CSS/JS/images at /assets/*, and those URLs are
// already in the wild (indexed pages, cached social cards, anything that scraped the old HTML)
// — see phase-3 doc §2. The marketplace has no /assets route today and doesn't reference one
// anywhere in src/ (it serves its own images/videos straight from public/images, public/videos);
// if a future marketplace feature ever wants a top-level /assets path, this redirect would need
// to move or narrow first — flagging that dependency rather than leaving it implicit.
const assetRedirect = {
  source: "/assets/:path*",
  destination: "/businesses/assets/:path*",
  permanent: true,
};

// Proxies /book/* to a local book-spa dev server, so "Book now" stays on localhost:3001
// instead of the address bar jumping to book-spa's own port. Opt-in and unset by default —
// production is untouched until book-spa's own origin is wired up here deliberately.
// book-spa serves itself at a /book/ base path (vite base + BrowserRouter basename, on its own
// side), so its own asset requests are also /book/assets/... — the same single rule covers
// those too, which is why the prefix is NOT stripped in the destination.
//
// This is next.config.ts's own `rewrites()`, not src/proxy.ts: Next's documented, supported
// mechanism for rewriting to an *external* origin is a rewrite with an absolute-URL
// destination (node_modules/next/dist/docs/.../rewrites.md, "Rewriting to an external URL") —
// checked rather than assumed, since proxy.ts's NextResponse.rewrite() is a same-app,
// same-process rewrite (how /businesses's mirrored index.html resolution works) and isn't the
// primitive for forwarding to a different server. The two don't interact: proxy.ts never sees
// /book/* at all, since next.config.ts's routing layer (headers -> redirects -> Proxy ->
// beforeFiles rewrites -> ...) runs rewrites independently of it.
const bookingEngineProxyTarget = process.env.BOOKING_ENGINE_PROXY_TARGET;
if (bookingEngineProxyTarget) {
  try {
    new URL(bookingEngineProxyTarget);
  } catch {
    throw new Error(
      `BOOKING_ENGINE_PROXY_TARGET is set to "${bookingEngineProxyTarget}", which isn't a valid ` +
        "absolute URL (expected something like http://localhost:4028). Fix or unset it."
    );
  }
}
const bookingProxyRewrite = bookingEngineProxyTarget
  ? [{ source: "/book/:path*", destination: `${bookingEngineProxyTarget}/book/:path*` }]
  : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [...marketingRedirects, assetRedirect];
  },
  async rewrites() {
    return bookingProxyRewrite;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      // Google account photos (profiles.avatarProvider, backfilled from Google sign-in metadata).
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // Supabase Storage (profiles.avatarUploaded — customer-uploaded photos, "avatars" bucket).
      // Derived from the same project the app already talks to, rather than hardcoding a project
      // ref, so this doesn't silently point at the wrong project in a different environment.
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
