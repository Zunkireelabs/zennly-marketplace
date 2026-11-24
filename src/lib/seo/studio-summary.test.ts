import { describe, expect, it } from "vitest";
import { studioSummary } from "./studio-summary";

const base = { name: "Sami's Brow and Lashes", modality: "Lashes & Brows", location: "Kathmandu", city: "Kathmandu", serviceCategories: [] as string[], services: [] as unknown[] };

describe("studioSummary", () => {
  it("names the studio, its kind and where it is", () => {
    expect(studioSummary(base as never)).toBe("Sami's Brow and Lashes is a lashes & brows in Kathmandu. You can see details and book on Zennly.");
  });
  it("lists up to three categories and the service count", () => {
    const s = studioSummary({ ...base, serviceCategories: ["Lashes", "Brows", "Mani & Pedi", "Facials"], services: [1, 2, 3] } as never);
    expect(s).toContain("It offers Lashes, Brows and Mani & Pedi.");
    expect(s).not.toContain("Facials");
    expect(s).toContain("3 services are listed with prices.");
  });
  it("uses the singular for one category and one service", () => {
    const s = studioSummary({ ...base, serviceCategories: ["Massage"], services: [1] } as never);
    expect(s).toContain("It offers Massage.");
    expect(s).toContain("1 service is listed");
  });
});
