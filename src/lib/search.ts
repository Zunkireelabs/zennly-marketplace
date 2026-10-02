import "server-only";
import { getProviders } from "./providers-data";
import type { Provider } from "./providers";

export type SearchQuery = {
  /** City or "City, ST". Empty means everywhere. */
  where: string;
  /** Treatment, category or studio name. Empty means anything. */
  what: string;
  /** Picked date (YYYY-MM-DD) and time label. Carried through for display; availability comes with the booking engine. */
  date: string;
  time: string;
};

export type SearchResult = {
  slug: string;
  name: string;
  city: string;
  region: string;
  modality: string;
  modalities: string[];
  rating: number;
  reviewCount: number;
  image: string;
  isNew: boolean;
  fromPrice: number;
  blurb: string;
  lat?: number;
  lng?: number;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Every word the person typed must appear somewhere in the haystack. */
const matches = (haystack: string, needle: string) => {
  const n = norm(needle);
  if (!n) return true;
  const h = norm(haystack);
  return n.split(" ").every((t) => h.includes(t));
};

function toResult(p: Provider): SearchResult {
  return {
    slug: p.slug,
    name: p.name,
    city: p.city,
    region: p.region,
    modality: p.modality,
    modalities: p.modalities,
    rating: p.rating,
    reviewCount: p.reviewCount,
    image: p.image,
    isNew: p.isNew,
    fromPrice: p.fromPrice,
    blurb: p.intro[0] ?? "",
    lat: p.lat,
    lng: p.lng,
  };
}

/** Studios matching Where and What, best-rated first. */
export async function searchStudios(q: Pick<SearchQuery, "where" | "what">): Promise<SearchResult[]> {
  const all = await getProviders();
  return all
    .filter((p) => matches(`${p.city} ${p.region} ${p.location}`, q.where))
    .filter((p) =>
      matches(
        [p.name, p.modality, ...p.modalities, ...p.serviceCategories, ...p.services.map((s) => s.name)].join(" "),
        q.what
      )
    )
    .sort((a, b) => b.rating - a.rating)
    .map(toResult);
}
