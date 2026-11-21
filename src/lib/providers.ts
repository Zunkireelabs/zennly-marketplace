/**
 * Provider types and pure helpers, safe to import from client components.
 *
 * Provider rows live in Supabase (`providers` table) and are read through
 * `providers-data.ts` (server only). The placeholder generator that fills the table lives in
 * `providers-seed.ts`. Cards link to a provider page through `providerHref(name)`, which
 * slugifies the name, so no card needs a separate id.
 *
 * Shaped as Provider → Service → (availability, generated in the booking drawer) so wiring the
 * real booking engine in later swaps the data source, not the components.
 */

export type Service = {
  id: string;
  name: string;
  category: string;
  /** Minutes. One entry = fixed length, two = a range ("60 – 90 min"). */
  durations: number[];
  price: number;
  description: string;
};

export type Review = {
  author: string;
  when: string;
  rating: number;
  visit: string;
  text: string;
  topics: ReviewTopic[];
};

export type ReviewTopic = "Service" | "Ambience" | "Value" | "Cleanliness";

/**
 * Virtual tour. Plays openly (no lead gate, unlike Le Collectionist's callback form): a trial
 * class is a low-commitment purchase, so the tour is the pitch and its CTA goes to booking.
 * `embedUrl` (Matterport/Kuula) takes over from `video` once a studio has a real scan.
 */
export type Tour = {
  video: string;
  poster: string;
  embedUrl?: string;
  /** Shown on the entry points, e.g. "0:12". */
  duration: string;
};

export type Provider = {
  slug: string;
  name: string;
  city: string;
  region: string;
  location: string;
  /** Neighbourhoods/municipalities this studio trades in — one per connected book-spa branch.
   *  Searched alongside city and region; not a place in its own right (see Destination). */
  areas?: string[];
  modality: string;
  modalities: string[];
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isRecommended: boolean;
  tone: string;
  image: string;
  gallery: string[];
  tour?: Tour;
  intro: string[];
  greatFor: string[];
  features: { label: string; detail: string }[];
  serviceCategories: string[];
  services: Service[];
  included: string[];
  addOns: { name: string; price: number }[];
  amenities: string[];
  address: string;
  hours: { day: string; open: string }[];
  /** Connected studios only: each branch's weekly hours, from book-spa by the drawer's own rule.
   *  Replaces `hours`, which for a connected studio is a stale seed copy. Unset = hide the block. */
  branchHours?: { branch: string; hours: { day: string; open: string }[] }[];
  nearby: { label: string; time: string }[];
  reviewSummary: string;
  reviews: Review[];
  fromPrice: number;
  /** Map position; unset studios list normally but get no pin. */
  lat?: number;
  lng?: number;
  /** The studio's engine booking page, once connected (Phase 3). Unset: Book opens the demo drawer. */
  bookingUrl?: string;
  /** book-spa org slug, once connected. Drives the real-booking drawer (NEXT_PUBLIC_ENGINE_BOOKING). */
  engineProviderId?: string;
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function providerHref(name: string): string {
  return `/providers/${slugify(name)}`;
}

export function formatDuration(durations: number[]): string {
  const fmt = (m: number) => (m >= 60 && m % 60 === 0 ? `${m / 60} hr` : m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`);
  const real = durations.filter((d) => d > 0);
  if (real.length === 0) return "";
  if (real.length === 1) return fmt(real[0]);
  return `${fmt(real[0])} – ${fmt(real[real.length - 1])}`;
}
