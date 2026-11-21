import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));
vi.mock("@/components/ui/rail-arrows", () => ({ RailArrows: () => null }));
vi.mock("framer-motion", () => {
  const motion = new Proxy({}, { get: () => ({ children }: { children: React.ReactNode }) => <div>{children}</div> });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>, useReducedMotion: () => false };
});

import { Recommended } from "./recommended";
import { NewToZennly } from "./new-to-zennly";
import { AllInOne } from "./all-in-one";
import { DiscoveryRow } from "./discovery-row";
import { BestRated, filterRail } from "./best-rated";
import { NoStudios } from "./no-studios";

const rail = (name: string) => ({
  slug: name, name, location: "Thamel, Kathmandu", modality: "Massage", modalities: ["Massage"], rating: 4.5, tone: "#ccc", image: "", isRecommended: true,
});

describe("a rail with no studios renders nothing at all", () => {
  it("Recommended", () => expect(renderToStaticMarkup(<Recommended providers={[]} />)).toBe(""));
  it("NewToZennly", () => expect(renderToStaticMarkup(<NewToZennly providers={[]} />)).toBe(""));
  it("AllInOne", () => expect(renderToStaticMarkup(<AllInOne providers={[]} />)).toBe(""));
  it("Your Mood with no mood", () => expect(renderToStaticMarkup(<DiscoveryRow intents={[]} />)).toBe(""));
  it("Every Studio, Every City with no studios", () =>
    expect(renderToStaticMarkup(<BestRated providers={[]} modalities={["All"]} locations={["All"]} />)).toBe(""));
  it("a rail with studios still shows its heading", () => {
    expect(renderToStaticMarkup(<Recommended providers={[rail("Nuad")]} />)).toContain("Handpicked for You");
  });
});

describe("Your Mood with one mood", () => {
  it("renders one tab and the studio, without crashing on the missing tabs", () => {
    const html = renderToStaticMarkup(<DiscoveryRow intents={[{ label: "Relax", providers: [rail("Nuad")] }]} />);
    expect(html).toContain("Relax");
    expect(html).toContain("Nuad");
    expect(html).toContain("Your Mood");
  });
});

describe("Every Studio, Every City: the filter row stays, an empty filter shows the card", () => {
  it("All shows studios, no card", () => {
    const html = renderToStaticMarkup(<BestRated providers={[rail("Nuad")]} modalities={["All", "Massage"]} locations={["All"]} />);
    expect(html).toContain("Nuad");
    expect(html).not.toContain("No studios for");
  });
});

describe("the filter card's reset", () => {
  const all = [{ ...rail("Nuad"), modality: "Massage" }, { ...rail("Sami"), modality: "Skincare", location: "Pokhara, Nepal" }];
  it("a filter with no studio is empty, and All brings every studio back", () => {
    expect(filterRail(all, "modality", "Yoga")).toEqual([]);
    expect(filterRail(all, "modality", "All")).toHaveLength(2);
  });
  it("location filter matches the city part", () => {
    expect(filterRail(all, "location", "Pokhara").map((p) => p.name)).toEqual(["Sami"]);
    expect(filterRail(all, "location", "Lalitpur")).toEqual([]);
  });
});

describe("no studios anywhere", () => {
  it("the block says so and offers the businesses page", () => {
    const html = renderToStaticMarkup(<NoStudios />);
    expect(html).toContain("New studios are joining Zennly soon");
    expect(html).toContain('href="/businesses"');
    expect(html).toContain("Own a studio? List it on Zennly");
  });
});
