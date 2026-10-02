import "server-only";
import { collectionSeeds } from "./collections-seed";
import { prisma } from "./prisma";
import type { Provider } from "./providers";
import { getProviders } from "./providers-data";

/**
 * Collections for the homepage tiles and /collections/[slug]. A collection is a titled, ordered
 * list of providers plus editorial copy (docs/PRODUCT_CONTEXT.md §3). Rows live in the
 * `collections` and `collection_providers` tables; provider data always comes from
 * providers-data.ts. Until DATABASE_URL is set, falls back to collections-seed.ts.
 */

/** What the homepage tile needs. */
export type CollectionTile = {
  slug: string;
  label: string;
  title: string;
  description: string;
  tone: string;
  image: string;
  imageAlt: string;
};

export type Collection = CollectionTile & {
  intro: string;
  /** In editorial order. */
  providers: Provider[];
};

type Row = CollectionTile & { intro: string; memberSlugs: string[] };

async function loadRows(): Promise<Row[]> {
  if (!prisma) return collectionSeeds.map((c) => ({ ...c, memberSlugs: c.providers }));
  const rows = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { providers: { orderBy: { position: "asc" }, select: { providerSlug: true } } },
  });
  return rows.map((c) => ({
    slug: c.slug,
    label: c.label,
    title: c.title,
    description: c.description,
    tone: c.tone,
    image: c.image,
    imageAlt: c.imageAlt,
    intro: c.intro,
    memberSlugs: c.providers.map((p) => p.providerSlug),
  }));
}

export async function getCollectionTiles(): Promise<CollectionTile[]> {
  const rows = await loadRows();
  return rows.map((c) => ({
    slug: c.slug,
    label: c.label,
    title: c.title,
    description: c.description,
    tone: c.tone,
    image: c.image,
    imageAlt: c.imageAlt,
  }));
}

export async function getCollectionSlugs(): Promise<string[]> {
  return (await loadRows()).map((c) => c.slug);
}

export async function getCollection(slug: string): Promise<Collection | undefined> {
  const row = (await loadRows()).find((c) => c.slug === slug);
  if (!row) return undefined;

  const bySlug = new Map((await getProviders()).map((p) => [p.slug, p]));
  const { memberSlugs, ...rest } = row;
  return {
    ...rest,
    providers: memberSlugs.flatMap((s) => {
      const p = bySlug.get(s);
      return p ? [p] : [];
    }),
  };
}
