import { SavedList } from "@/components/saved/saved-list";
import type { CollectionItem } from "@/components/collection/listing-row";
import { getProviders } from "@/lib/providers-data";

/**
 * A relocation, not a rebuild: saves already had a store, two API routes, a sign-in merge and a
 * standalone /saved page long before the account area existed. This renders the same list under
 * the account nav. /saved stays — it's linked from the header menu and reachable signed out,
 * which this route isn't.
 *
 * Like /saved, the server can't know which studios this visitor saved (the list lives on the
 * device until sign-in merges it), so it passes slim card data for all providers and SavedList
 * filters client-side.
 */
export default async function AccountFavouritesPage() {
  const providers = await getProviders();

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

  return <SavedList items={items} heading="Favourites" />;
}
