import { MARKETING_SITE } from "./site";

/**
 * Turns a link as the Eleventy templates wrote it ("/features/booking/") into the URL the live
 * site uses ("/businesses/features/booking"), the same rewrite scripts/sync-businesses-site.mjs
 * applied to the built HTML: prefix with /businesses, drop the trailing slash. External, tel:,
 * mailto: and #fragment links are returned untouched.
 */
export function businessesHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const stripped = href === "/" ? "" : href.replace(/\/+$/, "");
  return `${MARKETING_SITE.basePath}${stripped}`;
}
