import type { LookupResult, LookupRow } from "./studio-lookup";

// reachable: false is the default here on purpose — this constant is returned by every path that
// DIDN'T get a real answer from book-spa (config missing, non-2xx, unparseable body, network
// error/timeout). The one path that genuinely asked and got a real response builds its own object
// with reachable: true explicitly, below.
export const emptyResult: LookupResult = {
  found: false,
  reachable: false,
  bookings: [],
  membership: null,
  packages: [],
  vouchers: [],
  totalVisits: 0,
  referralEarnings: 0,
};

const LOOKUP_TIMEOUT_MS = 6000;

export async function lookupOne(orgSlug: string, email: string, functionsUrl: string, secret: string): Promise<LookupResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    const res = await fetch(`${functionsUrl}/marketplace-customer-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ org_slug: orgSlug, email }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      // bookX answered, so it IS reachable. A 404 ORG_NOT_ENABLED means the studio has switched
      // the lookup off: nothing to show, and no "couldn't reach" banner.
      if (res.status === 404) {
        const err: unknown = await res.json().catch(() => null);
        const code = err && typeof err === "object" ? (err as Record<string, unknown>).error_code : undefined;
        if (code === "ORG_NOT_ENABLED") return { ...emptyResult, reachable: true };
        return emptyResult;
      }
      // 401: our shared secret is wrong. A misconfiguration to fix, still a soft fail for the customer.
      if (res.status === 401) console.error("[studio-history] marketplace-customer-lookup returned 401: BOOK_SPA_MARKETPLACE_SECRET is wrong or missing on one side");
      // 5xx and anything else: we did not get a real answer.
      return emptyResult;
    }

    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object" || !("found" in json)) return emptyResult;
    const data = json as Record<string, unknown>;
    return {
      found: Boolean(data.found),
      reachable: true,
      // staff_label is the studio's word for its staff ("Therapist", "Stylist"...). It is sent once
      // for the whole reply; stamping it on each booking carries it through the merge and into
      // the page without a new field on every type.
      bookings: Array.isArray(data.bookings)
        ? (data.bookings as LookupRow[]).map((b) =>
            b && typeof b === "object" && typeof data.staff_label === "string" && data.staff_label.trim()
              ? { ...b, staff_label: data.staff_label.trim() }
              : b
          )
        : [],
      membership: data.membership && typeof data.membership === "object" ? (data.membership as Record<string, unknown>) : null,
      packages: Array.isArray(data.packages) ? data.packages : [],
      // Added in migration-336 alongside bookings/membership/packages — previously parsed off this
      // object and then dropped before the function returned, which is the same "compiles, runs,
      // delivers nothing" failure shape as the field-name bug in bookingLine().
      vouchers: Array.isArray(data.vouchers) ? data.vouchers : [],
      totalVisits: typeof data.total_visits === "number" ? data.total_visits : 0,
      referralEarnings: typeof data.referral_earnings === "number" ? data.referral_earnings : 0,
    };
  } catch {
    // Network error, timeout, or book-spa down — fail soft, same shape as "nothing found".
    return emptyResult;
  }
}
