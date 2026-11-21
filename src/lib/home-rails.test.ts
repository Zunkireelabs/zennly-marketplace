import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getProviders = vi.fn();
vi.mock("./providers-data", () => ({ getProviders: () => getProviders() }));

import { getHomeRails } from "./home-rails";

beforeEach(() => getProviders.mockReset());

const studio = (o: Record<string, unknown>) => ({
  slug: "x", name: "X", city: "K", region: "N", location: "K, Nepal", modality: "Spa", modalities: ["Spa"], services: [], rating: 4, tone: "", image: "", isRecommended: false, isNew: false, ...o,
});

describe("home rails with no studios", () => {
  it("nothing → every rail empty, no mood tabs, hasStudios false", async () => {
    getProviders.mockResolvedValue([]);
    const r = await getHomeRails();
    expect(r.discoveryIntents).toEqual([]);
    expect(r.bestRated.providers).toEqual([]);
    expect(r.recommended).toEqual([]);
    expect(r.newToZennly).toEqual([]);
    expect(r.allInOne).toEqual([]);
    expect(r.hasStudios).toBe(false);
  });
  it("two real, uncurated studios → hasStudios, both in Every Studio, the new one in Newly Welcomed with no label", async () => {
    getProviders.mockResolvedValue([
      studio({ slug: "nuad", name: "Nuad", rating: 4.8, modality: "Massage" }),
      studio({ slug: "samis", name: "Sami's", rating: 0, isNew: true, modality: "Brows & Lashes" }),
    ]);
    const r = await getHomeRails();
    expect(r.hasStudios).toBe(true);
    expect(r.bestRated.providers.map((p) => p.slug)).toEqual(["nuad", "samis"]);
    expect(r.bestRated.modalities).toContain("Brows & Lashes");
    expect(r.bestRated.locations).toContain("K");
    expect(r.newToZennly.map((p) => p.slug)).toEqual(["samis"]);
    expect(r.newToZennly[0].joinedLabel).toBeUndefined();
    expect(r.discoveryIntents).toEqual([]); // editorial rails stay editorial
    expect(r.recommended).toEqual([]);
  });
  it("curated + real mixed → curated order first, then others by rating then name", async () => {
    getProviders.mockResolvedValue([
      studio({ slug: "zeta", name: "Zeta", rating: 4 }),
      studio({ slug: "willow-and-stone", name: "Willow", rating: 4.1 }),
      studio({ slug: "alpha", name: "Alpha", rating: 4 }),
      studio({ slug: "studio-lumen", name: "Lumen", rating: 3 }),
    ]);
    const r = await getHomeRails();
    expect(r.bestRated.providers.map((p) => p.slug)).toEqual(["studio-lumen", "willow-and-stone", "alpha", "zeta"]);
  });
  it("a curated new studio keeps its editorial label", async () => {
    getProviders.mockResolvedValue([studio({ slug: "solace-float-studio", name: "Solace", isNew: true })]);
    const r = await getHomeRails();
    expect(r.newToZennly[0].joinedLabel).toBe("Joined this week");
  });
  it("one curated studio → only the moods that have one are offered", async () => {
    getProviders.mockResolvedValue([{ slug: "studio-lumen", name: "Lumen", city: "K", region: "N", location: "K", modality: "Spa", modalities: ["Spa"], services: [], rating: 4.5, tone: "", image: "", isRecommended: true }]);
    const r = await getHomeRails();
    expect(r.discoveryIntents.map((d) => d.label)).toEqual(["Unwind"]);
    expect(r.hasStudios).toBe(true);
  });
});
