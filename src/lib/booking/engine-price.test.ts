import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The page-side mapper is server-only; tests stub the marker module and the network.
vi.mock("server-only", () => ({}));

import { toEngineService } from "./engine-data";
import { fetchLiveServices } from "./engine-live-services";
import { cheapestPrice, chargedPrice, readBookableService } from "./engine-price";

// A tiered service shaped like a real public_get_bookable_services row: the tier spread
// (min_price/max_price) is present, but with no staff chosen book-spa charges effective_price_npr.
const TIERED = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "BANGKOK PACKAGE - 120min",
  category_name: "Packages",
  duration_minutes: 120,
  price_type: "tiered",
  price_npr: 7000,
  min_price: 1200,
  max_price: 8600,
  effective_price_npr: 8200,
  description: "Two hours",
  is_combo: true,
};
const FLAT = { id: "22222222-2222-4222-8222-222222222222", name: "Threading", category_name: "Threading", duration_minutes: 15, price_type: "flat", price_npr: 150, effective_price_npr: null };
const FREE = { id: "33333333-3333-4333-8333-333333333333", name: "Consult", category_name: "Other", duration_minutes: 15, price_npr: 0, effective_price_npr: 0 };

describe("one price: what book-spa charges with no staff chosen", () => {
  it("a tiered service shows effective_price_npr, not the tier floor, ceiling or base price", () => {
    expect(chargedPrice(TIERED)).toBe(8200);
    expect(chargedPrice(TIERED)).not.toBe(TIERED.min_price);
    expect(chargedPrice(TIERED)).not.toBe(TIERED.max_price);
    expect(chargedPrice(TIERED)).not.toBe(TIERED.price_npr);
  });

  it("falls back to price_npr only when there is no effective price", () => {
    expect(chargedPrice(FLAT)).toBe(150);
    expect(chargedPrice({ price_npr: "250" })).toBe(250);
    expect(chargedPrice({})).toBe(0);
  });

  it("a real zero effective price stays zero (it is not 'missing')", () => {
    expect(chargedPrice({ price_npr: 900, effective_price_npr: 0 })).toBe(0);
  });

  it("the drawer's mapper shows effective_price_npr and carries no range", () => {
    const s = toEngineService(TIERED);
    expect(s.priceNpr).toBe(8200);
    expect(s).not.toHaveProperty("priceRange");
  });

  it("the page's mapper shows the same price and carries no range", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([TIERED, FLAT]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_URL", "https://engine.example.test");
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_ANON_KEY", "anon");
    const live = await fetchLiveServices("nuad-thai-spa");
    const tiered = live!.services.find((s) => s.id === TIERED.id)!;
    expect(tiered.price).toBe(8200);
    expect(tiered).not.toHaveProperty("priceRange");
    expect(live!.services.find((s) => s.id === FLAT.id)!.price).toBe(150);
  });

  it("page and drawer agree on every service's price", async () => {
    const rows = [TIERED, FLAT, FREE];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 })));
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_URL", "https://engine.example.test");
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_ANON_KEY", "anon");
    const live = await fetchLiveServices("x");
    for (const row of rows) {
      expect(live!.services.find((s) => s.id === row.id)!.price).toBe(toEngineService(row).priceNpr);
    }
  });

  it("'Starting from' is the cheapest charged price, never a tier floor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([TIERED, FLAT, FREE]), { status: 200 })));
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_URL", "https://engine.example.test");
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_ANON_KEY", "anon");
    const live = await fetchLiveServices("x");
    expect(live!.fromPrice).toBe(150); // not 1,200 (TIERED's floor) and not 0 (the unpriced row)
  });
});

describe("cheapestPrice / readBookableService", () => {
  it("ignores zero and unpriced rows, and is 0 when nothing is priced", () => {
    expect(cheapestPrice([8200, 150, 0])).toBe(150);
    expect(cheapestPrice([0, 0])).toBe(0);
    expect(cheapestPrice([])).toBe(0);
  });

  it("reads the shared fields with safe defaults", () => {
    expect(readBookableService({ id: 5 })).toEqual({
      id: "5",
      name: "Service",
      category: "Other",
      durationMinutes: 60,
      price: 0,
      description: null,
      isCombo: false,
    });
  });
});

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
