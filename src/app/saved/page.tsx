import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/layout/site-nav";
import { Footer } from "@/components/layout/footer";
import { SavedList } from "@/components/saved/saved-list";
import type { CollectionItem } from "@/components/collection/listing-row";
import { getProviders } from "@/lib/providers-data";

// Signed in, saves sync to the account (saved-sync.tsx); signed out, they're device-only. Either
// way this is a personal list, never worth indexing.
export const metadata: Metadata = {
  title: "Saved studios | Zennly",
  robots: { index: false, follow: false },
};

// Regenerate at most every 5 minutes, like the other catalogue pages.
export const revalidate = 300;

export default async function SavedPage() {
  const providers = await getProviders();

  // The page cannot know which studios this visitor saved (that is client-side), so it passes the
  // slim card data for all of them and the client filters. Same shape the collection pages use.
  const items: CollectionItem[] = providers.map((p) => ({
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
                Saved
              </li>
            </ol>
          </nav>

          <SavedList items={items} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
