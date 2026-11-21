import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getProviderBookingStatus, getStudioStatus, isBookable, resetStudioStatusCache } from "./studio-status";

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  resetStudioStatusCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
  process.env.BOOK_SPA_FUNCTIONS_URL = "https://engine.example.test/functions/v1";
  process.env.BOOK_SPA_MARKETPLACE_SECRET = "test-secret-value";
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.BOOK_SPA_FUNCTIONS_URL;
  delete process.env.BOOK_SPA_MARKETPLACE_SECRET;
});

describe("studio status from bookX", () => {
  it("live → bookable, phone passed through", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "live", phone: "9800000000" }));
    const s = await getStudioStatus("nuad");
    expect(s).toEqual({ status: "live", phone: "9800000000" });
    expect(isBookable(s)).toBe(true);
  });

  it("sends the status action and org slug, secret only in the header", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "live", phone: null }));
    await getStudioStatus("nuad");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://engine.example.test/functions/v1/marketplace-customer-lookup");
    expect(JSON.parse(init.body)).toEqual({ action: "status", org_slug: "nuad" });
    expect(init.body).not.toContain("test-secret-value");
    expect(init.headers.Authorization).toBe("Bearer test-secret-value");
  });

  it("not_live → not bookable, keeps the phone for the tap-to-call line", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "not_live", phone: "01-4000000" }));
    const s = await getStudioStatus("nuad");
    expect(s).toEqual({ status: "not_live", phone: "01-4000000" });
    expect(isBookable(s)).toBe(false);
  });

  it("not_found → not bookable", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "not_found", phone: null }));
    expect(isBookable(await getStudioStatus("ghost"))).toBe(false);
  });

  it.each([
    ["a 500", () => reply(500, { status: "error", error_code: "UNEXPECTED_ERROR" })],
    ["an unknown status word", () => reply(200, { status: "maybe" })],
    ["a garbled body", () => new Response("<html>", { status: 200 })],
  ])("%s → error, not bookable", async (_n, make) => {
    fetchMock.mockResolvedValue(make());
    const s = await getStudioStatus("nuad");
    expect(s.status).toBe("error");
    expect(isBookable(s)).toBe(false);
  });

  it("a network failure → error", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    expect((await getStudioStatus("nuad")).status).toBe("error");
  });

  it("missing config → error and nothing is sent", async () => {
    delete process.env.BOOK_SPA_MARKETPLACE_SECRET;
    expect((await getStudioStatus("nuad")).status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an answer is reused for under a minute, then asked again", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "live", phone: null }));
    await getStudioStatus("nuad");
    await getStudioStatus("nuad");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_001);
    fetchMock.mockResolvedValue(reply(200, { status: "not_live", phone: null }));
    expect((await getStudioStatus("nuad")).status).toBe("not_live");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a failed check is retried after 10 seconds, not a minute", async () => {
    fetchMock.mockResolvedValueOnce(reply(500, {}));
    await getStudioStatus("nuad");
    vi.advanceTimersByTime(10_001);
    fetchMock.mockResolvedValue(reply(200, { status: "live", phone: null }));
    expect((await getStudioStatus("nuad")).status).toBe("live");
  });

  it("a studio with no bookX link is a demo (not_found) without asking bookX", async () => {
    expect((await getProviderBookingStatus(undefined)).status).toBe("not_found");
    expect((await getProviderBookingStatus(null)).status).toBe("not_found");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
