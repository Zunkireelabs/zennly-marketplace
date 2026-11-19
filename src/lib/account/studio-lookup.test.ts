import { describe, expect, it } from "vitest";
import { bookingLine, membershipView, mergeLookupResults, type LookupResult, type LookupRow } from "./studio-lookup";

/** Fills in the other fields with empty/zero defaults so each test only has to spell out the
 * part it's actually exercising. */
function result(partial: Partial<LookupResult>): LookupResult {
  return { found: true, bookings: [], packages: [], vouchers: [], membership: null, totalVisits: 0, referralEarnings: 0, ...partial };
}

/**
 * Fixtures shaped exactly like migration-336-marketplace-customer-lookup.sql's own
 * jsonb_build_object column lists — not guessed. This is the test that exists because the
 * previous field-name lists ("service_name", "amount", ...) were plausible-sounding guesses that
 * matched nothing book-spa actually sends, and every booking silently rendered "Visit" with no
 * price until someone checked. Keep these fixtures in sync with that migration file if it ever
 * changes — that's the whole point of having them here instead of inline ad-hoc objects.
 */
const REAL_BOOKING_ROW: LookupRow = {
  booking_number: "BN-2026-0042",
  status: "Completed",
  date: "2026-11-10",
  start_time: "14:30:00",
  end_time: "15:30:00",
  service_name_snapshot: "Deep Tissue Massage",
  service_duration_snapshot: 60,
  service_price_snapshot: 3500,
  service_category_snapshot: "Massage",
  room_name_snapshot: "Room 2",
  therapist_name_snapshot: "Sita Gurung",
  final_amount: 3150,
  discount_amount: 350,
  special_requests: null,
  customer_gender: "female",
};

const REAL_MEMBERSHIP_ROW: LookupRow = {
  tier_name: "Gold",
  membership_number: "MEM-00123",
  balance: 8200,
  total_deposited: 100000,
  activation_date: "2026-06-01",
  expiry_date: "2027-06-01",
  status: "active",
};

const REAL_VOUCHER_ROW: LookupRow = {
  voucher_code: "VCH-00055",
  remaining_balance: 1500,
  total_amount_issued: 2000,
  expiry_date: "2027-03-01",
};

const REAL_PACKAGE_ROW: LookupRow = {
  package_code: "PKG-00099",
  package_type_name: "10-Session Facial Pack",
  expiry_date: "2027-01-01",
  sessions_total: 10,
  sessions_used: 3,
  sessions_remaining: 7,
  status: "active",
  issued_date: "2026-09-01",
  paid_amount: 25000,
};

describe("bookingLine", () => {
  it("renders the real service name and amount from a migration-336-shaped row, not 'Visit'", () => {
    const line = bookingLine(REAL_BOOKING_ROW);
    expect(line.title).toContain("Deep Tissue Massage");
    expect(line.title).not.toBe("Visit");
    expect(line.title).toMatch(/Rs\s*3,150/);
    expect(line.detail).toContain("2026-11-10");
    expect(line.detail).toContain("14:30:00");
    expect(line.status).toBe("Completed");
  });

  it("falls back to 'Visit' with no price for a row with none of the known fields (defensive, not a regression)", () => {
    const line = bookingLine({ some_unrelated_field: "x" });
    expect(line.title).toBe("Visit");
    expect(line.detail).toBe("Date to be confirmed");
  });

  it("still finds the service name even under an older speculative key, by design", () => {
    const line = bookingLine({ service_name: "Legacy Key Massage", amount: 1000 });
    expect(line.title).toBe("Legacy Key Massage · Rs 1,000");
  });
});

describe("membershipView", () => {
  it("renders the real tier name and balance from a migration-336-shaped membership row", () => {
    const view = membershipView(REAL_MEMBERSHIP_ROW);
    expect(view.tier).toBe("Gold");
    expect(view.detail).toMatch(/Rs\s*8,200/);
    expect(view.status).toBe("active");
  });
});

describe("mergeLookupResults", () => {
  it("dedupes bookings by booking_number across multiple fanned-out factor results", () => {
    const a = result({ bookings: [REAL_BOOKING_ROW] });
    const b = result({ bookings: [REAL_BOOKING_ROW, { ...REAL_BOOKING_ROW, booking_number: "BN-2026-0099" }] });
    const merged = mergeLookupResults([a, b]);
    expect(merged.bookings).toHaveLength(2);
    expect(merged.bookings.map((r) => r.booking_number).sort()).toEqual(["BN-2026-0042", "BN-2026-0099"]);
  });

  it("picks the first non-null membership and logs rather than merges when a second differs", () => {
    const first = result({ membership: REAL_MEMBERSHIP_ROW });
    const second = result({ membership: { ...REAL_MEMBERSHIP_ROW, tier_name: "Platinum" } });
    const merged = mergeLookupResults([first, second], { orgSlug: "test-org", userId: "u1" });
    expect(merged.membership?.tier_name).toBe("Gold");
  });

  it("carries packages through using the real package row shape", () => {
    const merged = mergeLookupResults([result({ packages: [REAL_PACKAGE_ROW] })]);
    expect(merged.packages).toEqual([REAL_PACKAGE_ROW]);
  });

  it("dedupes packages by package_code, not booking_number (packages don't have one)", () => {
    const a = result({ packages: [REAL_PACKAGE_ROW] });
    const b = result({ packages: [REAL_PACKAGE_ROW, { ...REAL_PACKAGE_ROW, package_code: "PKG-00100" }] });
    const merged = mergeLookupResults([a, b]);
    expect(merged.packages).toHaveLength(2);
    expect(merged.packages.map((r) => r.package_code).sort()).toEqual(["PKG-00099", "PKG-00100"]);
  });

  it("dedupes vouchers by voucher_code the same way", () => {
    const a = result({ vouchers: [REAL_VOUCHER_ROW] });
    const b = result({ vouchers: [REAL_VOUCHER_ROW] });
    const merged = mergeLookupResults([a, b]);
    expect(merged.vouchers).toEqual([REAL_VOUCHER_ROW]);
  });

  it("carries vouchers/totalVisits/referralEarnings through the merge rather than dropping them", () => {
    const merged = mergeLookupResults([result({ vouchers: [REAL_VOUCHER_ROW], totalVisits: 12, referralEarnings: 500 })]);
    expect(merged.vouchers).toEqual([REAL_VOUCHER_ROW]);
    expect(merged.totalVisits).toBe(12);
    expect(merged.referralEarnings).toBe(500);
  });

  it("takes the max (not the sum) of totalVisits across factors resolving to the same customer, and logs when they differ", () => {
    const a = result({ totalVisits: 12, referralEarnings: 500 });
    const b = result({ totalVisits: 12, referralEarnings: 500 }); // same underlying customer record, same numbers
    const sameCustomer = mergeLookupResults([a, b]);
    expect(sameCustomer.totalVisits).toBe(12); // NOT 24 — summing identical factors would double-count
    expect(sameCustomer.referralEarnings).toBe(500);

    const c = result({ totalVisits: 12, referralEarnings: 500 });
    const d = result({ totalVisits: 20, referralEarnings: 500 }); // genuinely different value -> logged
    const differing = mergeLookupResults([c, d], { orgSlug: "test-org", userId: "u1" });
    expect(differing.totalVisits).toBe(20);
  });
});
