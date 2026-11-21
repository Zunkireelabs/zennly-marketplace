import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { compareByRating, hasRating } from "./rating";

describe("a studio with no reviews has no rating", () => {
  it("0 reviews or rating 0 or missing → no rating", () => {
    expect(hasRating({ rating: 0, reviewCount: 0 })).toBe(false);
    expect(hasRating({ rating: 4.5, reviewCount: 0 })).toBe(false);
    expect(hasRating({ rating: 0 })).toBe(false);
    expect(hasRating({ rating: null, reviewCount: 3 })).toBe(false);
    expect(hasRating({})).toBe(false);
  });
  it("with reviews → rating; rails without a count are judged by the rating", () => {
    expect(hasRating({ rating: 4.5, reviewCount: 12 })).toBe(true);
    expect(hasRating({ rating: 4.5 })).toBe(true);
  });
});

describe("sorting by rating", () => {
  const list = [
    { n: "unrated-a", rating: 0, reviewCount: 0 },
    { n: "four", rating: 4, reviewCount: 10 },
    { n: "unrated-b", rating: 0 },
    { n: "five", rating: 5, reviewCount: 2 },
    { n: "four-more", rating: 4, reviewCount: 30 },
  ];
  it("rated first (rating, then review count), unrated after, never ranked among them", () => {
    expect([...list].sort(compareByRating).map((x) => x.n)).toEqual(["five", "four-more", "four", "unrated-a", "unrated-b"]);
  });
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/saved/use-saved", () => ({ useSaved: () => ({ saved: false, toggle: () => {} }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/rail-arrows", () => ({ RailArrows: () => null }));
vi.mock("framer-motion", () => {
  const motion = new Proxy({}, { get: () => ({ children }: { children: React.ReactNode }) => <div>{children}</div> });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>, useReducedMotion: () => false };
});

import { BestRated } from "@/components/home/best-rated";
import { ListingRow } from "@/components/collection/listing-row";

const rail = (name: string, rating: number) => ({
  slug: name, name, location: "Thamel, Kathmandu", modality: "Massage", modalities: ["Massage"], rating, tone: "#ccc", image: "", isRecommended: false,
});

describe("badges", () => {
  it("Every Studio card: no ★ for an unrated studio, ★ for a rated one", () => {
    const html = renderToStaticMarkup(<BestRated providers={[rail("Unrated", 0), rail("Rated", 4.6)]} modalities={["All"]} locations={["All"]} />);
    expect(html).not.toContain("★ 0.0");
    expect(html.match(/★/g)).toHaveLength(1);
    expect(html).toContain("★ 4.6");
  });
  const item = (rating: number, reviewCount: number) => ({
    slug: "s", name: "S", city: "K", location: "K", modality: "Spa", modalities: [], rating, reviewCount, isNew: false, fromPrice: 1, images: [], blurb: "", amenities: [], greatFor: [],
  });
  it("collection row: no stars at 0 reviews, stars and count with reviews", () => {
    const none = renderToStaticMarkup(<ListingRow item={item(0, 0)} />);
    expect(none).not.toContain("(0)");
    expect(none).not.toMatch(/>0\.0</);
    const rated = renderToStaticMarkup(<ListingRow item={item(4.5, 12)} />);
    expect(rated).toContain("4.5");
    expect(rated).toContain("(12)");
  });
});
