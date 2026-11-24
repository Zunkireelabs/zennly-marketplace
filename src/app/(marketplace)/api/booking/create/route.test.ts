import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const providerFind = vi.fn();
const profileFind = vi.fn();
let sameOrigin = true;

vi.mock("@/lib/account/server", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("@/lib/supabase/api", () => ({ isSameOriginJson: () => sameOrigin, noStore: { "Cache-Control": "no-store" } }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider: { findUnique: (...a: unknown[]) => providerFind(...a) },
    profile: { findUnique: (...a: unknown[]) => profileFind(...a) },
  },
}));

const studioStatus = vi.fn();
vi.mock("@/lib/booking/studio-status", () => ({ getStudioStatus: (...a: unknown[]) => studioStatus(...a) }));

import { POST } from "./route";

const REQUEST_ID = "7d9f1f0e-2b57-4a39-9c1a-0d0f6f0f8f11";
const goodBody = {
  providerSlug: "nuad-thai-spa",
  branchId: "11111111-1111-4111-8111-111111111111",
  serviceId: "22222222-2222-4222-8222-222222222222",
  date: "2026-11-24",
  startTime: "10:00:00",
  customerName: "Asha Rai",
  customerPhone: "9800000000",
  specialRequests: null,
  clientRequestId: REQUEST_ID,
};

function req(body: unknown, raw?: string): NextRequest {
  return new Request("http://localhost/api/booking/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  }) as unknown as NextRequest;
}

const fetchMock = vi.fn();

beforeEach(() => {
  sameOrigin = true;
  getSessionUser.mockReset().mockResolvedValue({ id: "user-1", email: "session@example.com" });
  studioStatus.mockReset().mockResolvedValue({ status: "live", phone: null });
  providerFind.mockReset().mockResolvedValue({ engineProviderId: "nuad-thai-spa" });
  profileFind.mockReset().mockResolvedValue({ gender: "female" });
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ success: true, booking: { id: "b1", booking_number: "BK-100", final_amount: 2500 } }), { status: 200 })
  );
  vi.stubGlobal("fetch", fetchMock);
  process.env.BOOK_SPA_FUNCTIONS_URL = "https://engine.example.test/functions/v1";
  process.env.BOOK_SPA_MARKETPLACE_SECRET = "test-secret-value";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BOOK_SPA_FUNCTIONS_URL;
  delete process.env.BOOK_SPA_MARKETPLACE_SECRET;
});

const sentToBookx = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

describe("bookX ids that are not RFC v1-v5 uuids are accepted", () => {
  it("nil-style branch and service ids pass validation", async () => {
    const res = await POST(
      req({ ...goodBody, branchId: "b0000000-0000-0000-0000-000000000001", serviceId: "00000000-0000-0000-0000-000000000001" })
    );
    expect(res.status).not.toBe(400);
    expect(sentToBookx().branchId ?? sentToBookx().branch_id ?? JSON.stringify(sentToBookx())).toContain("b0000000-0000-0000-0000-000000000001");
  });
});

describe("identity: the customer's email comes from the session, never the body", () => {
  it("sends the session email even when the body tries to supply another", async () => {
    await POST(req({ ...goodBody, email: "attacker@example.com", customerEmail: "attacker@example.com", customer: { email: "attacker@example.com" } }));
    const sent = sentToBookx();
    expect(sent.customer.email).toBe("session@example.com");
    expect(JSON.stringify(sent)).not.toContain("attacker@example.com");
  });

  it("sends the signed-in user's own gender from their profile, not from the body", async () => {
    await POST(req({ ...goodBody, gender: "male" }));
    expect(sentToBookx().customer.gender).toBe("female");
  });

  it("no session → 401 and nothing is sent to bookX", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await POST(req(goodBody));
    expect(res.status).toBe(401);
    expect((await res.json()).errorCode).toBe("UNAUTHENTICATED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a cross-origin request → 403 and nothing is sent", async () => {
    sameOrigin = false;
    expect((await POST(req(goodBody))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("a missing or invalid body gives a plain error and sends nothing", () => {
  const cases: [string, unknown, string?][] = [
    ["not JSON", undefined, "{not json"],
    ["empty object", {}],
    ["no phone", { ...goodBody, customerPhone: undefined }],
    ["empty name", { ...goodBody, customerName: "" }],
    ["branch id not a uuid", { ...goodBody, branchId: "nope" }],
    ["service id not a uuid", { ...goodBody, serviceId: "nope" }],
    ["bad date", { ...goodBody, date: "24/11/2026" }],
    ["bad time", { ...goodBody, startTime: "10am" }],
    ["service id junk", { ...goodBody, serviceId: "not-an-id-at-all-but-36-chars-long!!" }],
    ["request id not a uuid", { ...goodBody, clientRequestId: "abc" }],
    ["no request id", { ...goodBody, clientRequestId: undefined }],
  ];
  it.each(cases)("%s → 400 INVALID_REQUEST", async (_name, body, raw) => {
    const res = await POST(req(body, raw));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.errorCode).toBe("INVALID_REQUEST");
    expect(json.message).toMatch(/missing or invalid/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("what is sent to bookX", () => {
  it("forwards the client's request id as the idempotency key, identically on a retry", async () => {
    await POST(req(goodBody));
    await POST(req(goodBody));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [a, b] = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string));
    expect(a.idempotency_key).toBe(REQUEST_ID);
    expect(b.idempotency_key).toBe(REQUEST_ID);
  });

  it("targets the marketplace-create-booking function with the org, branch, service and time", async () => {
    await POST(req(goodBody));
    expect(fetchMock.mock.calls[0][0]).toBe("https://engine.example.test/functions/v1/marketplace-create-booking");
    const sent = sentToBookx();
    expect(sent).toMatchObject({
      org_slug: "nuad-thai-spa",
      branch_id: goodBody.branchId,
      service_id: goodBody.serviceId,
      date: "2026-11-24",
      start_time: "10:00:00",
      gender_preference: null,
      therapist_ids: null,
    });
    expect(sent.customer).toMatchObject({ full_name: "Asha Rai", phone: "9800000000" });
  });

  it("the shared secret goes only in the Authorization header, never in the body or the response", async () => {
    const res = await POST(req(goodBody));
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-secret-value");
    expect(fetchMock.mock.calls[0][1].body).not.toContain("test-secret-value");
    expect(JSON.stringify(await res.json())).not.toContain("test-secret-value");
  });

  it("an unconnected studio is refused before anything is sent", async () => {
    providerFind.mockResolvedValue({ engineProviderId: null });
    const json = await (await POST(req(goodBody))).json();
    expect(json).toMatchObject({ ok: false, errorCode: "ORG_NOT_ENABLED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["not_live", "BOOKING_NOT_LIVE"],
    ["not_found", "BOOKING_NOT_LIVE"],
    ["error", "BOOKING_UNAVAILABLE"],
  ])("a studio that is %s is refused with %s and nothing is sent to bookX", async (status, code) => {
    studioStatus.mockResolvedValue({ status, phone: null });
    const json = await (await POST(req(goodBody))).json();
    expect(json).toMatchObject({ ok: false, errorCode: code });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a live studio is asked about by its org slug and the booking goes through", async () => {
    const json = await (await POST(req(goodBody))).json();
    expect(studioStatus).toHaveBeenCalledWith("nuad-thai-spa");
    expect(json.ok).toBe(true);
  });

  it("missing server config → 503 SERVER_MISCONFIGURED and nothing is sent", async () => {
    delete process.env.BOOK_SPA_MARKETPLACE_SECRET;
    const res = await POST(req(goodBody));
    expect(res.status).toBe(503);
    expect((await res.json()).errorCode).toBe("SERVER_MISCONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("what comes back", () => {
  it("success passes the booking through", async () => {
    const json = await (await POST(req(goodBody))).json();
    expect(json).toEqual({ ok: true, booking: { id: "b1", booking_number: "BK-100", final_amount: 2500 } });
  });

  it("a bookX refusal comes back as ok:false with its code", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, error_code: "BRANCH_CLOSED", message: "closed" }), { status: 200 }));
    expect(await (await POST(req(goodBody))).json()).toMatchObject({ ok: false, errorCode: "BRANCH_CLOSED" });
  });

  it("an unparseable reply → UNEXPECTED_ERROR (outcome unknown)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    expect(await (await POST(req(goodBody))).json()).toMatchObject({ ok: false, errorCode: "UNEXPECTED_ERROR" });
  });

  it("a network failure → UNREACHABLE (outcome unknown)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await (await POST(req(goodBody))).json()).toMatchObject({ ok: false, errorCode: "UNREACHABLE" });
  });
});
