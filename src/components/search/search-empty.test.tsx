import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { SearchEmpty } from "./search-empty";

const html = (p: Partial<Parameters<typeof SearchEmpty>[0]>) =>
  renderToStaticMarkup(<SearchEmpty query={{ where: "", what: "" }} narrowed={false} view="list" onClearFilters={() => {}} {...p} />);

describe("empty search", () => {
  it("names what was searched and Clear search goes back to /search (so the URL params clear)", () => {
    const h = html({ query: { where: "Kathmandu", what: "Hot stone" } });
    expect(h).toContain("No studios for &quot;Hot stone&quot; in Kathmandu yet");
    expect(h).toContain('href="/search"');
    expect(h).toContain("Clear search");
  });
  it("only a location, only a treatment", () => {
    expect(html({ query: { where: "Pokhara", what: "" } })).toContain("No studios in Pokhara yet");
    expect(html({ query: { where: "", what: "Yoga" } })).toContain("No studios for &quot;Yoga&quot; yet");
  });
  it("keeps the map view when clearing from the map", () => {
    expect(html({ query: { where: "X", what: "" }, view: "map" })).toContain('href="/search?view=map"');
  });
  it("filters or map area with no search → Clear filters button", () => {
    const h = html({ narrowed: true });
    expect(h).toContain("No studios match these filters");
    expect(h).toContain("Clear filters");
  });
  it("no search, no filters, no studios → studios are joining soon", () => {
    expect(html({})).toContain("New studios are joining Zennly soon");
  });
});
