import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { getCollection, getCollectionSlugs } from "@/lib/collections";
import { CollectionBrowser } from "@/components/collection/collection-browser";
import type { CollectionItem } from "@/components/collection/listing-row";

// Regenerate at most every 5 minutes, so database edits reach collection pages without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return {};
  return {
    title: `${collection.label} | Zennly collections`,
    description: collection.intro,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: { type: "website", url: `/collections/${slug}`, title: `${collection.label} | Zennly collections`, description: collection.intro, images: [{ url: "/businesses/assets/images/og-default.jpg", width: 1200, height: 630 }] },
  };
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const items: CollectionItem[] = collection.providers.map((p) => ({
    slug: p.slug,
    name: p.name,
    city: p.city,
    location: p.location,
    modality: p.modality,
    modalities: p.modalities,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isNew: p.isNew,
    fromPrice: p.fromPrice,
    images: p.gallery.slice(0, 4),
    blurb: p.intro.join(" "),
    amenities: p.amenities.slice(0, 5),
    greatFor: p.greatFor,
    isDemo: !p.engineProviderId,
  }));

  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <SiteNav />
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <nav aria-label="Breadcrumb" className="pt-5 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link href="/" className="hover:text-foreground hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li aria-current="page" className="font-medium text-foreground">
                {collection.label}
              </li>
            </ol>
          </nav>

          <CollectionBrowser items={items} title={collection.title} intro={collection.intro} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
