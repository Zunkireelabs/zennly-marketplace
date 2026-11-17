import "server-only";
import type { Provider } from "./providers";
import { getProviders } from "./providers-data";

/**
 * Homepage provider rails, derived from the `providers` table.
 *
 * Provider facts (name, city, photo, rating, modalities, isNew, isRecommended) always come from
 * the database, so editing a studio once updates the provider page and every rail. What stays
 * here is editorial curation only: which studios go on which rail, and in what order. A slug
 * that isn't in the database is skipped.
 */

export type RailProvider = {
  slug: string;
  name: string;
  location: string;
  modality: string;
  modalities: string[];
  rating: number;
  tone: string;
  image: string;
  isRecommended: boolean;
};

export type NewRailProvider = RailProvider & { joinedLabel: string };

export type Destination = { city: string; region: string; count: number; image: string };

export type SearchStudio = {
  slug: string;
  name: string;
  city: string;
  region: string;
  image: string;
  rating: number;
  isNew: boolean;
  modalities: string[];
};
export type SearchTreatment = { name: string; fromPrice: number; studios: string[] };
/** Everything the hero's "What" search needs, client-side: studios plus de-duplicated treatments. */
export type SearchIndex = { studios: SearchStudio[]; treatments: SearchTreatment[] };

export type HomeRails = {
  searchIndex: SearchIndex;
  destinations: Destination[];
  discoveryIntents: { label: string; providers: RailProvider[] }[];
  bestRated: { providers: RailProvider[]; modalities: string[]; locations: string[] };
  recommended: RailProvider[];
  newToZennly: NewRailProvider[];
  allInOne: RailProvider[];
};

/** "Your Mood" tabs, three studios each. */
const DISCOVERY: { label: string; slugs: string[] }[] = [
  { label: "Unwind", slugs: ["studio-lumen", "willow-and-stone", "the-quiet-room"] },
  { label: "Restore", slugs: ["sable-recovery-lab", "basalt-and-bloom", "north-fork-sauna-co"] },
  { label: "Glow", slugs: ["gloss-hair-studio", "lash-and-brow-atelier", "the-beauty-bar"] },
  { label: "Center", slugs: ["priya-r-movement-studio", "quiet-practice-yoga", "breathline-breathwork"] },
];

/** "Every Studio, Every City", in display order. "Recommended" is the `isRecommended` subset. */
const BEST_RATED = [
  "studio-lumen",
  "willow-and-stone",
  "north-fork-sauna-co",
  "reset-cryo-and-cold-plunge",
  "priya-r-movement-studio",
  "quiet-practice-yoga",
  "basalt-and-bloom",
  "daniel-k-sauna-studio",
  "the-quiet-room",
  "breathline-breathwork",
];

/** This rail files some studios under a broader modality tab than their own primary one. */
const BEST_RATED_MODALITY: Record<string, string> = {
  "breathline-breathwork": "Yoga",
};

const BEST_RATED_TABS = ["All", "Massage", "Yoga", "Sauna", "Cold Plunge", "Skincare"];

/** "Newly Welcomed". The label stands in for a real joined-at date once bookings are live. */
const NEW_TO_ZENNLY: { slug: string; joinedLabel: string }[] = [
  { slug: "solace-float-studio", joinedLabel: "Joined this week" },
  { slug: "marrow-and-salt", joinedLabel: "Joined this week" },
  { slug: "hush-skin-clinic", joinedLabel: "Joined 2 weeks ago" },
  { slug: "terra-firma-pilates", joinedLabel: "Joined 2 weeks ago" },
  { slug: "even-keel-bodywork", joinedLabel: "Joined 3 weeks ago" },
  { slug: "cinder-sauna-house", joinedLabel: "Joined 3 weeks ago" },
];

/** "All Under One Roof": studios offering several services. */
const ALL_IN_ONE = [
  "studio-lumen",
  "north-fork-sauna-co",
  "priya-r-movement-studio",
  "the-quiet-room",
  "basalt-and-bloom",
];

function toRail(p: Provider, modality = p.modality): RailProvider {
  return {
    slug: p.slug,
    name: p.name,
    location: p.location,
    modality,
    modalities: p.modalities,
    rating: p.rating,
    tone: p.tone,
    image: p.image,
    isRecommended: p.isRecommended,
  };
}

export async function getHomeRails(): Promise<HomeRails> {
  const all = await getProviders();
  const bySlug = new Map(all.map((p) => [p.slug, p]));

  // One entry per city, busiest first; the photo is the city's top-rated studio.
  const byCity = new Map<string, Provider[]>();
  for (const p of all) byCity.set(p.city, [...(byCity.get(p.city) ?? []), p]);
  const destinations: Destination[] = Array.from(byCity.values())
    .map((ps) => {
      const best = [...ps].sort((a, b) => b.rating - a.rating)[0];
      return { city: best.city, region: best.region, count: ps.length, image: best.image };
    })
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  const pick = <T,>(slugs: string[], build: (p: Provider, slug: string) => T): T[] =>
    slugs.flatMap((slug) => {
      const p = bySlug.get(slug);
      return p ? [build(p, slug)] : [];
    });

  const bestRated = pick(BEST_RATED, (p, slug) => toRail(p, BEST_RATED_MODALITY[slug]));

  const treatmentMap = new Map<string, SearchTreatment>();
  for (const p of all) {
    for (const svc of p.services) {
      if (svc.category === "Add-ons") continue;
      const key = svc.name.toLowerCase();
      const t = treatmentMap.get(key) ?? { name: svc.name, fromPrice: svc.price, studios: [] };
      t.fromPrice = Math.min(t.fromPrice, svc.price);
      if (!t.studios.includes(p.slug)) t.studios.push(p.slug);
      treatmentMap.set(key, t);
    }
  }
  const searchIndex: SearchIndex = {
    studios: all.map((p) => ({
      slug: p.slug,
      name: p.name,
      city: p.city,
      region: p.region,
      image: p.image,
      rating: p.rating,
      isNew: p.isNew,
      modalities: p.modalities,
    })),
    treatments: Array.from(treatmentMap.values()),
  };

  return {
    searchIndex,
    destinations,
    discoveryIntents: DISCOVERY.map((d) => ({ label: d.label, providers: pick(d.slugs, (p) => toRail(p)) })),
    bestRated: {
      providers: bestRated,
      modalities: BEST_RATED_TABS,
      locations: ["All", ...Array.from(new Set(bestRated.map((p) => p.location.split(",")[0])))],
    },
    recommended: bestRated.filter((p) => p.isRecommended),
    newToZennly: NEW_TO_ZENNLY.flatMap(({ slug, joinedLabel }) => {
      const p = bySlug.get(slug);
      return p ? [{ ...toRail(p), joinedLabel }] : [];
    }),
    allInOne: pick(ALL_IN_ONE, (p) => toRail(p)),
  };
}
