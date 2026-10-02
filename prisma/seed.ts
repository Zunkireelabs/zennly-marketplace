/**
 * Loads the placeholder providers into the database. Safe to re-run: rows upsert by slug.
 * Run: npm run prisma:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedProviders } from "../src/lib/providers-seed";
import { collectionSeeds } from "../src/lib/collections-seed";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL in .env first.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  for (const p of seedProviders) {
    const data = {
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
      hours: p.hours,
      nearby: p.nearby,
      reviewSummary: p.reviewSummary,
      reviews: p.reviews,
      fromPrice: p.fromPrice,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
    };
    await prisma.provider.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
  }
  console.log(`Seeded ${seedProviders.length} providers`);

  // Collections come after providers, since each membership row points at a provider.
  for (const [sortOrder, c] of collectionSeeds.entries()) {
    const data = {
      label: c.label,
      title: c.title,
      description: c.description,
      intro: c.intro,
      tone: c.tone,
      image: c.image,
      imageAlt: c.imageAlt,
      sortOrder,
    };
    await prisma.collection.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...data }, update: data });
    // Rebuild membership so removed or reordered studios don't linger.
    await prisma.collectionProvider.deleteMany({ where: { collectionSlug: c.slug } });
    await prisma.collectionProvider.createMany({
      data: c.providers.map((providerSlug, position) => ({ collectionSlug: c.slug, providerSlug, position })),
    });
  }
  console.log(`Seeded ${collectionSeeds.length} collections`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
