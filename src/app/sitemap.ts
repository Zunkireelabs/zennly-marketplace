import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getCollectionSlugs } from "@/lib/collections";
import { getProviders } from "@/lib/providers-data";

// Production origin for every <loc> — sitemaps are read by crawlers against the canonical
// domain, never against whatever host served the request, so this does not fall back to
// request.nextUrl.origin the way the auth routes do.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zennly.io";

/**
 * Walks the mirrored web-zenly output (public/businesses/) for every `index.html` it contains,
 * rather than hardcoding the marketing URL list — a new web-zenly page picked up by
 * `scripts/sync-businesses-site.mjs` appears here automatically, with no edit to this file.
 * `404.html` isn't named `index.html` so it's excluded by construction.
 *
 * No trailing slash on any entry: Next defaults to trailingSlash:false, so `/businesses/pricing/`
 * 308s to `/businesses/pricing` before it ever reaches a page — a sitemap <loc> that 308s
 * instead of serving 200 directly violates Google's canonical-URL guidance (see
 * scripts/sync-businesses-site.mjs's stripTrailingSlash for the matching fix on canonical/og:url).
 */
function listBusinessesUrls(): string[] {
  const root = path.join(process.cwd(), "public", "businesses");
  if (!existsSync(root)) return [];

  const urls: string[] = [];
  function walk(dir: string, relativeUrl: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${relativeUrl}/${entry.name}`);
      } else if (entry.name === "index.html") {
        urls.push(relativeUrl === "" ? "/businesses" : `/businesses${relativeUrl}`);
      }
    }
  }
  walk(root, "");
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collectionSlugs, providers] = await Promise.all([getCollectionSlugs(), getProviders()]);

  const marketplaceEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.8 },
    ...collectionSlugs.map((slug) => ({
      url: `${SITE_URL}/collections/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...providers.map((provider) => ({
      url: `${SITE_URL}/providers/${provider.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  const businessesEntries: MetadataRoute.Sitemap = listBusinessesUrls().map((urlPath) => ({
    url: `${SITE_URL}${urlPath}`,
    changeFrequency: "monthly" as const,
    priority: urlPath === "/businesses" ? 0.9 : 0.5,
  }));

  return [...marketplaceEntries, ...businessesEntries];
}
