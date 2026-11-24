import { describe, expect, it } from "vitest";
import { studioTitle } from "./studio-title";

describe("studioTitle", () => {
  it("keeps the full form when it fits in 60", () => {
    expect(studioTitle("Nuad Thai", "Massage", "Kathmandu")).toBe("Nuad Thai · Massage in Kathmandu | Zennly");
  });
  it("drops the studio type when too long", () => {
    const t = studioTitle("Sami's Brow and Lashes", "Lashes & Brows", "Kathmandu");
    expect(t).toBe("Sami's Brow and Lashes in Kathmandu | Zennly");
    expect(t.length).toBeLessThanOrEqual(60);
  });
  it("falls back to name only, then shortens a very long name", () => {
    expect(studioTitle("A".repeat(45), "Spa", "Kathmandu Valley Region")).toBe(`${"A".repeat(45)} | Zennly`);
    const t = studioTitle("B".repeat(80), "Spa", "Kathmandu");
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.endsWith("… | Zennly")).toBe(true);
  });
});
