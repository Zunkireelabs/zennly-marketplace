import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});
const notFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
vi.mock("next/navigation", () => ({ redirect: (t: string) => redirect(t), notFound: () => notFound() }));
vi.mock("@/components/layout/site-nav", () => ({ SiteNav: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));
vi.mock("@/components/booking/book-hero", () => ({ BookHero: () => null }));
vi.mock("@/components/booking/flow", () => ({ BookFlow: () => null }));
vi.mock("@/lib/booking/engine-flag", () => ({ isEngineActive: () => true }));
const applyLiveServices = vi.fn();
vi.mock("@/lib/booking/load-provider", () => ({ applyLiveServices: (...a: unknown[]) => applyLiveServices(...a) }));
const getProvider = vi.fn();
vi.mock("@/lib/providers-data", () => ({ getProvider: (...a: unknown[]) => getProvider(...a) }));
const status = vi.fn();
vi.mock("@/lib/booking/studio-status", async () => ({
  getProviderBookingStatus: (...a: unknown[]) => status(...a),
  isBookable: (s: { status: string }) => s.status === "live",
}));

import BookLayout from "./layout";

const run = () =>
  BookLayout({ children: null, params: Promise.resolve({ slug: "nuad" }) } as unknown as Parameters<typeof BookLayout>[0]);

beforeEach(() => {
  redirect.mockClear();
  applyLiveServices.mockReset();
  getProvider.mockReset().mockResolvedValue({ slug: "nuad", engineProviderId: "nuad-org" });
});

describe("booking pages are for live studios only", () => {
  it("live → the page renders", async () => {
    status.mockResolvedValue({ status: "live", phone: null });
    await expect(run()).resolves.toBeTruthy();
    expect(applyLiveServices).toHaveBeenCalled();
  });
  it.each(["not_live", "not_found", "error"])("%s → redirected to the studio page, no engine reads", async (s) => {
    status.mockResolvedValue({ status: s, phone: null });
    await expect(run()).rejects.toThrow("REDIRECT:/providers/nuad");
    expect(applyLiveServices).not.toHaveBeenCalled();
  });
});
