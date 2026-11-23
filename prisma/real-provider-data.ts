import type { RealProvider } from "../src/lib/providers-real";

/** The columns a real (engine-connected) provider row is written with. Shared by the full seed and seed-provider.ts. */
export function realProviderData(p: RealProvider) {
  return {
      name: p.name,
      city: p.city,
      region: p.region,
      location: p.location,
      modality: p.modality,
      modalities: p.modalities,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isNew: p.isNew,
      isRecommended: p.isRecommended,
      tone: p.tone,
      image: p.image,
      gallery: p.gallery,
      tour: p.tour ?? undefined,
      intro: p.intro,
      greatFor: p.greatFor,
      features: p.features,
      serviceCategories: p.serviceCategories,
      services: p.services,
      included: p.included,
      addOns: p.addOns,
      amenities: p.amenities,
      address: p.address,
      areas: p.areas ?? [],
      hours: p.hours,
      nearby: p.nearby,
      reviewSummary: p.reviewSummary,
      reviews: p.reviews,
      fromPrice: p.fromPrice,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      engineProviderId: p.engineProviderId,
    };
}
