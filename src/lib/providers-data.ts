import "server-only";
import type { Provider as ProviderRow } from "@/generated/prisma/client";
import type { Provider } from "./providers";
import { prisma } from "./prisma";
import { seedProviders } from "./providers-seed";

/**
 * Where book-spa's customer booking flow lives. Production is app.zennly.io (absolute,
 * cross-origin); whatever this resolves to must also be on BOOKING_HOST_ALLOWLIST in
 * src/lib/booking/start-booking.ts, which refuses any host not listed there.
 */
function bookingEngineOrigin(): string {
  return process.env.NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN || "https://app.zennly.io";
}

/**
 * Once next.config.ts's /book/* rewrite is actually proxying to book-spa (same env var drives
 * both, single source of truth), the booking link can be a same-origin relative path instead of
 * an absolute cross-origin URL — this is what keeps "Book now" on localhost:3001's own origin
 * rather than visibly jumping to book-spa's port. BOOKING_ENGINE_PROXY_TARGET is server-only
 * and this file is server-only, so no NEXT_PUBLIC_ duplicate of it is needed here.
 */
function bookingProxyEnabled(): boolean {
  return Boolean(process.env.BOOKING_ENGINE_PROXY_TARGET);
}

/**
 * Server-side provider reads. Source of truth is the `providers` table (prisma/schema.prisma).
 * Until DATABASE_URL is set, falls back to the placeholder generator so local dev keeps working.
 */

function toProvider(r: ProviderRow): Provider {
  return {
    slug: r.slug,
    name: r.name,
    city: r.city,
    region: r.region,
    location: r.location,
    areas: r.areas,
    modality: r.modality,
    modalities: r.modalities,
    rating: r.rating,
    reviewCount: r.reviewCount,
    isNew: r.isNew,
    isRecommended: r.isRecommended,
    tone: r.tone,
    image: r.image,
    gallery: r.gallery,
    tour: (r.tour as Provider["tour"] | null) ?? undefined,
    intro: r.intro,
    greatFor: r.greatFor,
    features: r.features as Provider["features"],
    serviceCategories: r.serviceCategories,
    services: r.services as Provider["services"],
    included: r.included,
    addOns: r.addOns as Provider["addOns"],
    amenities: r.amenities,
    address: r.address,
    hours: r.hours as Provider["hours"],
    nearby: r.nearby as Provider["nearby"],
    reviewSummary: r.reviewSummary,
    reviews: r.reviews as Provider["reviews"],
    fromPrice: r.fromPrice,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    // Stage 1 handoff (docs/booking-integration-plan.md): engineProviderId is the book-spa org
    // slug. Connected providers get a real booking link; everyone else keeps bookingUrl
    // undefined, which startBooking() reads as "open the demo drawer instead."
    bookingUrl: r.engineProviderId
      ? bookingProxyEnabled()
        ? `/book/${r.engineProviderId}`
        : `${bookingEngineOrigin()}/${r.engineProviderId}`
      : undefined,
    engineProviderId: r.engineProviderId ?? undefined,
  };
}

export async function getProviders(): Promise<Provider[]> {
  if (!prisma) {
    console.warn("[providers] DATABASE_URL not set, using placeholder data.");
    return seedProviders;
  }
  const rows = await prisma.provider.findMany({ orderBy: { name: "asc" } });
  return rows.map(toProvider);
}

export async function getProvider(slug: string): Promise<Provider | undefined> {
  if (!prisma) return seedProviders.find((p) => p.slug === slug);
  const row = await prisma.provider.findUnique({ where: { slug } });
  return row ? toProvider(row) : undefined;
}

/** Other providers ranked by shared modality first, then same city, then rating. */
export async function getRelatedProviders(provider: Provider, limit = 6): Promise<Provider[]> {
  const all = await getProviders();
  return all
    .filter((p) => p.slug !== provider.slug)
    .map((p) => ({
      p,
      score:
        (p.modality === provider.modality ? 4 : 0) +
        (p.modalities.some((m) => provider.modalities.includes(m)) ? 2 : 0) +
        (p.city === provider.city ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
    .slice(0, limit)
    .map(({ p }) => p);
}
