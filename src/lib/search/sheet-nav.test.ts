import { describe, expect, it } from "vitest";
import { nextSheet, type Sheet } from "./sheet-nav";

describe("nextSheet", () => {
  it("opens the location picker when the pill is tapped", () => {
    expect(nextSheet(null, "openPill")).toBe("location");
  });

  it("advances from the location picker to the form on chevron", () => {
    expect(nextSheet("location", "chevron")).toBe("form");
  });

  it("advances from the location picker to the form on picking a city", () => {
    expect(nextSheet("location", "pickCity")).toBe("form");
  });

  it("advances from the location picker to the form on picking a service", () => {
    expect(nextSheet("location", "pickService")).toBe("form");
  });

  it("closes the sheet entirely on picking a studio — it navigates away, not to the form", () => {
    expect(nextSheet("location", "pickStudio")).toBe(null);
  });

  it("closes entirely from the form on chevron", () => {
    expect(nextSheet("form", "chevron")).toBe(null);
  });

  it("goes from the form back to the location picker when its Where card is tapped", () => {
    expect(nextSheet("form", "tapWhere")).toBe("location");
  });

  it("closes entirely from the form on search", () => {
    expect(nextSheet("form", "search")).toBe(null);
  });

  it("closes entirely from the form on hardware back — same as chevron, not a step to location", () => {
    expect(nextSheet("form", "back")).toBe(null);
  });

  it("steps from the location picker back to the form on hardware back — same as chevron", () => {
    expect(nextSheet("location", "back")).toBe("form");
  });

  it("leaves the sheet unchanged for a combination the table doesn't define", () => {
    const unlisted: [Sheet, Parameters<typeof nextSheet>[1]][] = [
      [null, "chevron"],
      [null, "pickCity"],
      [null, "pickService"],
      [null, "pickStudio"],
      [null, "tapWhere"],
      [null, "search"],
      [null, "back"],
      ["location", "tapWhere"],
      ["location", "search"],
      ["form", "pickCity"],
      ["form", "pickService"],
      ["form", "pickStudio"],
      ["form", "openPill"],
    ];
    for (const [sheet, action] of unlisted) {
      expect(nextSheet(sheet, action)).toBe(sheet);
    }
  });
});
