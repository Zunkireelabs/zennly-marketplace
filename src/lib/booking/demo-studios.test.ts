import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: null }));
vi.mock("@/lib/providers-seed", () => ({
  seedProviders: [
    { slug: "real", name: "Real", engineProviderId: "real-org" },
    { slug: "demo", name: "Demo" },
  ],
}));

import { isDemoListing, showDemoStudios, visibleProviders } from "./demo-studios";
import { getProvider, getProviders } from "@/lib/providers-data";

afterEach(() => vi.unstubAllEnvs());

describe("demo studio switch", () => {
  it("off by default: demo listings are hidden from lists", async () => {
    expect(showDemoStudios()).toBe(false);
    expect((await getProviders()).map((p) => p.slug)).toEqual(["real"]);
  });
  it("off: a demo's direct URL is not found, a real studio is", async () => {
    expect(await getProvider("demo")).toBeUndefined();
    expect((await getProvider("real"))?.slug).toBe("real");
  });
  it("on: demos appear in lists and on their direct URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEMO_STUDIOS", "on");
    expect((await getProviders()).map((p) => p.slug)).toEqual(["real", "demo"]);
    expect((await getProvider("demo"))?.slug).toBe("demo");
  });
  it("only the exact value 'on' turns it on", () => {
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEMO_STUDIOS", "true");
    expect(showDemoStudios()).toBe(false);
  });
  it("a demo is a listing with no bookX link", () => {
    expect(isDemoListing({})).toBe(true);
    expect(isDemoListing({ engineProviderId: "x" })).toBe(false);
    expect(visibleProviders([{ engineProviderId: "x" }, {}])).toHaveLength(1);
  });
});
