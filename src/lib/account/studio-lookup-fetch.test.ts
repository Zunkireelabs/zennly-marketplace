import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupOne } from "./studio-lookup-fetch";

const call = () => lookupOne("nuad-thai-spa", "a@b.test", "https://engine.test/functions/v1", "secret");
const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lookupOne", () => {
  it("200 → reachable with the data", async () => {
    vi.stubGlobal("fetch", reply(200, { found: true, bookings: [{ id: 1 }], total_visits: 3 }));
    const r = await call();
    expect(r).toMatchObject({ found: true, reachable: true, totalVisits: 3 });
    expect(r.bookings).toHaveLength(1);
  });

  it("staff_label is stamped on each booking so the page can use the studio's own word", async () => {
    vi.stubGlobal("fetch", reply(200, { found: true, staff_label: "Stylist", staff_label_plural: "Stylists", bookings: [{ booking_number: "B1" }] }));
    expect((await call()).bookings[0]).toMatchObject({ booking_number: "B1", staff_label: "Stylist" });
  });

  it("no staff_label → bookings are left as sent", async () => {
    vi.stubGlobal("fetch", reply(200, { found: true, bookings: [{ booking_number: "B1" }] }));
    expect((await call()).bookings[0]).toEqual({ booking_number: "B1" });
  });

  it("404 ORG_NOT_ENABLED → reachable, nothing to show (no 'couldn't reach')", async () => {
    vi.stubGlobal("fetch", reply(404, { error_code: "ORG_NOT_ENABLED" }));
    const r = await call();
    expect(r).toMatchObject({ found: false, reachable: true, bookings: [], totalVisits: 0 });
  });

  it("any other 404 → not reachable", async () => {
    vi.stubGlobal("fetch", reply(404, { error_code: "SOMETHING_ELSE" }));
    expect((await call()).reachable).toBe(false);
  });

  it("401 → not reachable, and logged as a misconfiguration", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", reply(401, { error: "unauthorized" }));
    expect((await call()).reachable).toBe(false);
    expect(err).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0][0])).toContain("401");
  });

  it("500 → not reachable", async () => {
    vi.stubGlobal("fetch", reply(500, {}));
    expect((await call()).reachable).toBe(false);
  });

  it("network error or timeout → not reachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    expect((await call()).reachable).toBe(false);
  });
});
