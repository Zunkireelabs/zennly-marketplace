import { afterEach, describe, expect, it, vi } from "vitest";

// Spy on the only thing that can reach the network: the Supabase client constructor.
const createClient = vi.fn(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: (...a: unknown[]) => createClient(...(a as [])) }));

import { engineBookingEnabled, isEngineActive } from "./engine-flag";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  createClient.mockClear();
});

describe("flag off (NEXT_PUBLIC_ENGINE_BOOKING unset): nothing changes", () => {
  it("is off when unset, empty, or anything other than exactly 'on'", () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "");
    expect(engineBookingEnabled()).toBe(false);
    for (const v of ["off", "0", "true", "1", "ON", " on"]) {
      vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", v);
      expect(engineBookingEnabled()).toBe(false);
    }
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "on");
    expect(engineBookingEnabled()).toBe(true);
  });

  it("the engine path is inactive for EVERY provider, connected or not", () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "");
    expect(isEngineActive("nuad-thai-spa")).toBe(false);
    expect(isEngineActive(undefined)).toBe(false);
    expect(isEngineActive(null)).toBe(false);
  });

  it("flag on: active only for a connected provider, never for an unconnected one", () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "on");
    expect(isEngineActive("nuad-thai-spa")).toBe(true);
    expect(isEngineActive(undefined)).toBe(false);
    expect(isEngineActive("")).toBe(false);
  });

  it("with no engine env configured, every fetcher is a safe no-op and never opens a client", async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BOOK_SPA_ENGINE_ANON_KEY", "");
    const data = await import("./engine-data");
    expect(await data.fetchEngineOrg("x")).toBeNull();
    expect(await data.fetchEngineBranches("x")).toEqual([]);
    expect(await data.fetchEngineServices("x")).toEqual([]);
    expect(await data.fetchEngineBranchServices("x", "b")).toEqual([]);
    expect(await data.fetchEngineTherapists("x", "b", [])).toEqual([]);
    expect(await data.fetchEngineRooms("b")).toEqual([]);
    expect(await data.fetchEngineClosedRanges("b", "2026-11-23", "2026-12-23")).toBeNull();
    expect(await data.fetchEngineBranchHours("b")).toBeNull();
    expect(await data.fetchEngineAvailabilityWindow("b", "2026-11-23", "2026-12-23")).toEqual({ rooms: [], bookings: [] });
    expect(await data.fetchEngineTherapistWindow("x", "b", "2026-11-23", "2026-12-23")).toEqual([]);
    expect(await data.fetchEngineGenderHeadcount("x", "b", "s")).toEqual({ male: 0, female: 0 });
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("startBooking with the flag off keeps today's handoff behaviour", () => {
  const provider = (over: Record<string, unknown>) =>
    ({ slug: "nuad", name: "Nuad", bookingUrl: "https://app.zennly.io/nuad", engineProviderId: "nuad", ...over }) as never;

  it("flag off + connected + booking link → hands off to the link in the SAME tab, not the drawer", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "");
    const open = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", { open, location: { assign } });
    const { startBooking } = await import("./start-booking");
    const result = startBooking({ provider: provider({}), selection: { serviceIds: [] } });
    expect(result.kind).toBe("external");
    // Anish's 8dbfee5: the hand-off navigates this tab (location.assign) and never opens a new one.
    expect(assign).toHaveBeenCalledTimes(1);
    expect(String(assign.mock.calls[0][0])).toContain("app.zennly.io/nuad");
    expect(open).not.toHaveBeenCalled();
  });

  it("flag off + unconnected + no link → the in-page demo drawer, as before", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "");
    const { startBooking } = await import("./start-booking");
    const result = startBooking({ provider: provider({ bookingUrl: undefined, engineProviderId: undefined }), selection: { serviceIds: [] } });
    expect(result.kind).toBe("drawer");
  });

  it("flag ON + connected → the studio's booking pages in the same tab (no drawer, no hand-off)", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "on");
    const assign = vi.fn();
    const open = vi.fn();
    vi.stubGlobal("window", { open, location: { assign } });
    const { startBooking } = await import("./start-booking");
    const none = startBooking({ provider: provider({}), selection: { serviceIds: [] } });
    expect(none).toMatchObject({ kind: "page", url: "/providers/nuad/book" });
    const withService = startBooking({ provider: provider({}), selection: { serviceIds: ["svc-1"] } });
    expect(withService).toMatchObject({ kind: "page", url: "/providers/nuad/book?service=svc-1" });
    expect(assign).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("flag ON + UNCONNECTED → the demo drawer, unchanged", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENGINE_BOOKING", "on");
    const { startBooking } = await import("./start-booking");
    const result = startBooking({ provider: provider({ bookingUrl: undefined, engineProviderId: undefined }), selection: { serviceIds: ["x"] } });
    expect(result.kind).toBe("drawer");
  });
});
