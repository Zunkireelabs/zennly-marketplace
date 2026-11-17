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
// /businesses. Every one of the 34 relocating sitemap URLs sits under one of these
// eleven top-level prefixes, and the marketplace owns a disjoint set of paths
// (api, auth, collections, providers, saved, search), so a prefix mapping is lossless.
// Both trailing-slash shapes are in the wild — the old sitemap published `/pricing/`
// while web-zenly's own nav linked `/pricing` — and both resolve. Next's trailing-slash
// normalization runs *before* redirects, so `/pricing/` 308s to `/pricing` first and then
// matches the rule below; a rule for the slashed shape would be dead code. Verified: both
// shapes end at /businesses/pricing, the slashed one via one extra hop.
const MOVED_MARKETING_PREFIXES = [
  "about",
  "blog",
  "case-study",
  "demo",
  "features",
  "glossary",
  "how-it-works",
  "pricing",
  "privacy-policy",
  "solutions",
  "terms-of-service",
];

// `permanent: true` is a 308, not a 301: it is the permanent redirect that preserves the
// request method. Search engines treat it the same as a 301 for canonicalization.
const marketingRedirects = MOVED_MARKETING_PREFIXES.map((prefix) => ({
  source: `/${prefix}/:path*`,
  destination: `/businesses/${prefix}/:path*`,
  permanent: true,
}));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return marketingRedirects;
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
    ],
  },
};

export default nextConfig;
