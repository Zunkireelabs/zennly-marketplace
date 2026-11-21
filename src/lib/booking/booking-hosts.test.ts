import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { allowedBookingHosts } from "./start-booking";
import { bookingEngineOrigin } from "../providers-data";

const KEY = "NEXT_PUBLIC_BOOKING_ENGINE_ORIGIN";
afterEach(() => vi.unstubAllEnvs());

describe("allowedBookingHosts", () => {
  it("prod origin: only app.zennly.io", () => {
    vi.stubEnv(KEY, "https://app.zennly.io");
    expect(allowedBookingHosts()).toEqual(["app.zennly.io"]);
  });
  it("staging origin: dev-app is allowed too", () => {
    vi.stubEnv(KEY, "https://dev-app.zennly.io");
    expect(allowedBookingHosts()).toEqual(["app.zennly.io", "dev-app.zennly.io"]);
  });
  it("unset: app only", () => {
    vi.stubEnv(KEY, "");
    expect(allowedBookingHosts()).toEqual(["app.zennly.io"]);
  });
  it("unparsable origin: app only", () => {
    vi.stubEnv(KEY, "not a url");
    expect(allowedBookingHosts()).toEqual(["app.zennly.io"]);
  });
});

describe("bookingEngineOrigin", () => {
  it("unset: no default, never dev-app", () => {
    vi.stubEnv(KEY, "");
    expect(bookingEngineOrigin()).toBeNull();
  });
  it("set: returns it", () => {
    vi.stubEnv(KEY, "https://app.zennly.io");
    expect(bookingEngineOrigin()).toBe("https://app.zennly.io");
  });
});
