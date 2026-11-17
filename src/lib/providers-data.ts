import "server-only";
import type { Provider as ProviderRow } from "@/generated/prisma/client";
import type { Provider } from "./providers";
import { prisma } from "./prisma";
import { seedProviders } from "./providers-seed";

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
    bookingUrl: r.engineProviderId ? `https://app.zennly.io/${r.engineProviderId}` : undefined,
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
