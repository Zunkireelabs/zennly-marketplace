/**
 * Destinations inside the mirrored web-zenly marketing site (public/businesses/,
 * scripts/sync-businesses-site.mjs). Single source of truth — before this, the "For Businesses"
 * link (then labeled "For Providers") was threaded as a prop through every <Footer> call site
 * and silently fell back to a dead "#" wherever a caller forgot to pass it (src/app/page.tsx,
 * src/app/not-found.tsx), while
 * nav.tsx separately hardcoded the pre-cutover "https://zennly.io/" absolute URL. Both bugs
 * were two symptoms of the same root cause: no single place owning the correct value.
 */
export const MARKETING_SITE_HOME = "/businesses";
export const MARKETING_ABOUT = "/businesses/about";
