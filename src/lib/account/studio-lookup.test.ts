import { describe, expect, it } from "vitest";
import {
  bookingDetail,
  bookingLine,
  membershipDetail,
  membershipView,
  mergeLookupResults,
  packageView,
  voucherView,
  type LookupResult,
  type LookupRow,
} from "./studio-lookup";

/** Fills in the other fields with empty/zero defaults so each test only has to spell out the
 * part it's actually exercising. */
function result(partial: Partial<LookupResult>): LookupResult {
  return {
    found: true,
    reachable: true,
    bookings: [],
    packages: [],
    vouchers: [],
    membership: null,
    totalVisits: 0,
    referralEarnings: 0,
    ...partial,
  };
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

  it("carries vouchers through the merge rather than dropping them", () => {
    const merged = mergeLookupResults([result({ vouchers: [REAL_VOUCHER_ROW] })]);
    expect(merged.vouchers).toEqual([REAL_VOUCHER_ROW]);
  });

  it("derives totalVisits from the merged bookings' Completed count, not from either factor's own total_visits number", () => {
    const completed1 = { ...REAL_BOOKING_ROW, booking_number: "BN-1", status: "Completed" };
    const completed2 = { ...REAL_BOOKING_ROW, booking_number: "BN-2", status: "Completed" };
    const cancelled = { ...REAL_BOOKING_ROW, booking_number: "BN-3", status: "Cancelled" };
    // Deliberately WRONG totalVisits on the input, to prove the merge ignores it and recomputes
    // from the actual bookings array instead.
    const merged = mergeLookupResults([result({ bookings: [completed1, completed2, cancelled], totalVisits: 999 })]);
    expect(merged.totalVisits).toBe(2); // Completed only — Cancelled doesn't count
  });

  it(
    "two factors both reporting non-zero totalVisits/referralEarnings is unreachable by construction, " +
      "not a supported path — migration-336 matches customers.email, a single-valued column, so two " +
      "DIFFERENT verified emails can never resolve to the SAME customer row",
    () => {
      // If this scenario somehow occurred anyway, it would mean two DISTINCT customer records with
      // disjoint bookings — which is exactly the next test, not this one.
      const a = result({ bookings: [{ ...REAL_BOOKING_ROW, booking_number: "BN-1", status: "Completed" }] });
      const b = result({ bookings: [{ ...REAL_BOOKING_ROW, booking_number: "BN-1", status: "Completed" }] }); // same booking_number -> deduped
      const merged = mergeLookupResults([a, b]);
      expect(merged.totalVisits).toBe(1); // deduped to one booking, not two
    }
  );

  it("sums totalVisits and referralEarnings across two genuinely distinct customer records (disjoint bookings), and logs the duplicate-record case", () => {
    const recordA = result({
      bookings: [{ ...REAL_BOOKING_ROW, booking_number: "BN-A1", status: "Completed" }],
      referralEarnings: 300,
    });
    const recordB = result({
      bookings: [{ ...REAL_BOOKING_ROW, booking_number: "BN-B1", status: "Completed" }],
      referralEarnings: 200,
    });
    const merged = mergeLookupResults([recordA, recordB], { orgSlug: "test-org", userId: "u1" });
    expect(merged.totalVisits).toBe(2); // union of two disjoint bookings, not a max of 1
    expect(merged.referralEarnings).toBe(500); // sum, not max — both are real, non-overlapping credits
  });

  it("reachable is true if ANY factor reached book-spa — one timed-out email among several isn't an outage", () => {
    const reached = result({ reachable: true, found: true });
    const timedOut = result({ reachable: false, found: false });
    const merged = mergeLookupResults([timedOut, reached]);
    expect(merged.reachable).toBe(true);
  });

  it("reachable is false only when EVERY factor failed to reach book-spa", () => {
    const a = result({ reachable: false, found: false });
    const b = result({ reachable: false, found: false });
    const merged = mergeLookupResults([a, b]);
    expect(merged.reachable).toBe(false);
  });
});

/** Helper: the labels present on a details list, in order — asserting on labels rather than the
 *  whole row objects keeps these readable and still catches a field going missing. */
const labels = (r: { rows: { label: string }[] }) => r.rows.map((x) => x.label);
const valueOf = (r: { rows: { label: string; value: string }[] }, label: string) =>
  r.rows.find((x) => x.label === label)?.value;

describe("membershipDetail", () => {
  it("renders all five detail fields from a real row", () => {
    const d = membershipDetail(REAL_MEMBERSHIP_ROW);
    expect(d.tier).toBe("Gold");
    expect(d.status).toBe("active");
    expect(labels(d)).toEqual(["Membership no.", "Balance", "Total deposited", "Activated", "Expires"]);
    expect(valueOf(d, "Balance")).toBe("Rs 8,200");
    expect(valueOf(d, "Membership no.")).toBe("MEM-00123");
  });

  it("drops rows whose field is absent rather than rendering an empty one", () => {
    // activation_date is null for a membership that hasn't been activated — the 'pending' case.
    const d = membershipDetail({ ...REAL_MEMBERSHIP_ROW, activation_date: null, status: "pending" });
    expect(labels(d)).not.toContain("Activated");
    expect(d.status).toBe("pending");
  });

  it("takes status verbatim and never derives it from expiry_date", () => {
    // Expired a year ago, but book-spa says active. We must not "correct" that: the server
    // computes status in Asia/Kathmandu, and a browser recomputing it would disagree abroad.
    const d = membershipDetail({ ...REAL_MEMBERSHIP_ROW, expiry_date: "2025-01-01", status: "active" });
    expect(d.status).toBe("active");
  });
});

describe("packageView", () => {
  it("renders sessions as one readable state, not three numbers", () => {
    const p = packageView(REAL_PACKAGE_ROW);
    expect(p.name).toBe("10-Session Facial Pack");
    expect(p.sessions).toBe("3 of 10 used · 7 left");
    expect(valueOf(p, "Code")).toBe("PKG-00099");
    expect(valueOf(p, "Paid")).toBe("Rs 25,000");
  });

  it("omits sessions entirely when the counts aren't numbers", () => {
    const p = packageView({ ...REAL_PACKAGE_ROW, sessions_total: null, sessions_used: null });
    expect(p.sessions).toBeUndefined();
    expect(p.name).toBe("10-Session Facial Pack");
  });

  it("does not fall back to bookingLine's shape — a package is not a visit", () => {
    // The bug this replaces: packages were concatenated into bookings and pushed through
    // bookingLine(), matching none of their field names, so every one rendered "Visit".
    expect(packageView(REAL_PACKAGE_ROW).name).not.toBe("Visit");
    expect(bookingLine(REAL_PACKAGE_ROW).title).toBe("Visit");
  });
});

describe("voucherView", () => {
  it("renders remaining against the issued total", () => {
    const v = voucherView(REAL_VOUCHER_ROW);
    expect(v.code).toBe("VCH-00055");
    expect(v.remaining).toBe("Rs 1,500");
    expect(valueOf(v, "Issued for")).toBe("Rs 2,000");
  });
});

describe("bookingDetail", () => {
  it("renders the fields bookingLine never showed", () => {
    const d = bookingDetail(REAL_BOOKING_ROW);
    expect(d.service).toBe("Deep Tissue Massage");
    expect(d.when).toBe("2026-11-10 · 14:30:00–15:30:00");
    expect(valueOf(d, "Therapist")).toBe("Sita Gurung");
    expect(valueOf(d, "Room")).toBe("Room 2");
    expect(valueOf(d, "Paid")).toBe("Rs 3,150");
    expect(valueOf(d, "Discount")).toBe("Rs 350");
  });

  it("hides a zero discount rather than printing 'Rs 0' on every full-price booking", () => {
    const d = bookingDetail({ ...REAL_BOOKING_ROW, discount_amount: 0 });
    expect(labels(d)).not.toContain("Discount");
    expect(valueOf(d, "Paid")).toBe("Rs 3,150");
  });

  it("falls back to the start time alone when there is no end time", () => {
    const d = bookingDetail({ ...REAL_BOOKING_ROW, end_time: null });
    expect(d.when).toBe("2026-11-10 · 14:30:00");
  });
});
