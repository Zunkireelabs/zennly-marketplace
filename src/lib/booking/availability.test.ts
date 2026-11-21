import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { availabilityFor, telHref } from "./availability";

const st = (status: "live" | "not_live" | "not_found" | "error", phone: string | null = null) => ({ status, phone });

describe("what the studio page offers", () => {
  it("live → live", () => expect(availabilityFor("nuad", st("live"))).toEqual({ state: "live" }));
  it("not live → sentence, with the phone when there is one", () => {
    expect(availabilityFor("nuad", st("not_live", "980-000-0000"))).toEqual({ state: "not_live", phone: "980-000-0000" });
    expect(availabilityFor("nuad", st("not_live"))).toEqual({ state: "not_live", phone: null });
  });
  it("check failed → unavailable, never the phone", () => {
    expect(availabilityFor("nuad", st("error", "980"))).toEqual({ state: "unavailable" });
  });
  it("no bookX link at all → demo, whatever the status says", () => {
    expect(availabilityFor(undefined, st("live"))).toEqual({ state: "demo" });
    expect(availabilityFor(null, st("not_found"))).toEqual({ state: "demo" });
  });
  it("a linked studio bookX doesn't know is NOT a demo: not live, and the slug is logged", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(availabilityFor("sbal", st("not_found"))).toEqual({ state: "not_live", phone: null });
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain("sbal");
    warn.mockRestore();
  });
  it("tel link keeps digits and a leading plus", () => {
    expect(telHref("+977 980-000 0000")).toBe("tel:+9779800000000");
  });
});
