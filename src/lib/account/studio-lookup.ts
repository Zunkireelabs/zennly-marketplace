import { formatDuration } from "@/lib/providers";

/**
 * Shared shape + rendering rules for book-spa's marketplace-customer-lookup response, used by
 * both the per-studio "Your visits here" section (studio-history.tsx) and the cross-studio
 * profile page. book-spa's response field names aren't frozen yet, so nothing here hard-depends
 * on an exact key — `field()` tries a short list of plausible names per concept and renders
 * whatever's there, so a rename on their side degrades a row's detail rather than breaking the
 * section entirely.
 */

export type LookupRow = Record<string, unknown>;
export type LookupResult = {
  found: boolean;
  /**
   * Whether book-spa was actually asked and answered — distinct from `found`, which only makes
   * sense once `reachable` is true. Before this field existed, a dead host, a timeout, a
   * malformed response, and a genuine "no history here" all produced the identical
   * `{found: false, bookings: [], ...}` shape, so no caller could tell "you have no visits here"
   * from "we couldn't check right now" — they're very different things to tell a customer. Only
   * `lookupOne`'s genuine success path (a real, parsed response from book-spa) sets this true;
   * every fail-soft path (config missing, non-2xx, unparseable body, network error/timeout) in
   * route.ts leaves it false, which is also `emptyResult`'s default.
   */
  reachable: boolean;
  bookings: LookupRow[];
  membership: LookupRow | null;
  packages: LookupRow[];
  /** All added in migration-336 alongside bookings/membership/packages, carried all the way
   * through route.ts and this file's merge — a passthrough that drops a field compiles and runs
   * fine while silently delivering nothing, the same failure shape as never sending it at all. */
  vouchers: LookupRow[];
  totalVisits: number;
  referralEarnings: number;
};

function field(row: LookupRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asMoney(value: unknown): string | undefined {
  if (typeof value === "number") return `NPR ${value.toLocaleString("en-IN")}`;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-23" → "Mon 23 Nov 2026". Calendar arithmetic only, no timezone. Anything else is returned as it came. */
export function formatLookupDate(value: unknown): string | undefined {
  const text = asText(value);
  if (!text) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!m) return text;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${DAYS[dow]} ${d} ${MONTHS[mo - 1]} ${y}`;
}

function clock12(hhmm: string): { h: number; m: number; suffix: "AM" | "PM" } | null {
  const m = /^(\d{2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  return { h: h % 12 === 0 ? 12 : h % 12, m: Number(m[2]), suffix: h >= 12 ? "PM" : "AM" };
}

/**
 * "09:50:00","10:20:00" → "9:50 – 10:20 AM"; across noon "11:30 AM – 12:30 PM"; start only → "9:50 AM".
 * The studio's own wall-clock time (Kathmandu): stored as a local time, so nothing is converted.
 */
export function formatLookupTimeRange(start: unknown, end?: unknown): string | undefined {
  const s = asText(start);
  const a = s ? clock12(s) : null;
  if (!s) return undefined;
  if (!a) return s;
  const fmt = (c: { h: number; m: number }) => `${c.h}:${String(c.m).padStart(2, "0")}`;
  const e = asText(end);
  const b = e ? clock12(e) : null;
  if (!b) return `${fmt(a)} ${a.suffix}`;
  return a.suffix === b.suffix ? `${fmt(a)} – ${fmt(b)} ${b.suffix}` : `${fmt(a)} ${a.suffix} – ${fmt(b)} ${b.suffix}`;
}

/** Minutes as "30 min" / "1 hr 30 min"; a non-numeric value is shown as it came. */
function formatLookupDuration(value: unknown): string | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  if (Number.isFinite(n) && n > 0) return formatDuration([n]);
  return asText(value);
}

const plainWords = (raw: string) => {
  const t = raw.replace(/[_-]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

/** book-spa's booking statuses in plain words. A status we don't know is shown as written, tidied, never hidden. */
export function bookingStatusLabel(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const known: Record<string, string> = {
    pending: "Waiting for the studio to confirm",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    "no show": "Did not attend",
    "in-progress": "In progress",
  };
  return known[status.trim().toLowerCase()] ?? plainWords(status);
}

/** The membership status book-spa computes ('active' | 'pending' | 'depleted' | 'lapsed') in plain words. */
export function membershipStatusLabel(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const known: Record<string, string> = {
    active: "Active",
    pending: "Not active yet",
    depleted: "Balance used up",
    lapsed: "Expired",
  };
  return known[status.trim().toLowerCase()] ?? plainWords(status);
}

/**
 * The money row for a booking. The studio's price (final_amount) is NOT proof of payment, so it is
 * labelled "Price" unless the lookup itself says the booking was paid. bookX sends `payment_status`
 * and `paid_amount` (paid minus refunds); "Paid" shows only when bookX says so, with the amount
 * bookX gives. Never inferred from the price or the booking status.
 */
export function bookingPriceRow(b: LookupRow): DetailRow | undefined {
  const price = asMoney(field(b, ["final_amount"]));
  if (!price) return undefined;
  const pay = asText(field(b, ["payment_status"]))?.trim().toLowerCase().replace(/[\s_-]+/g, "");
  // paid_amount is what the customer paid minus refunds, so it is what we show as "Paid". A
  // paid booking with nothing left after refunds shows as Refunded.
  const paidSoFar = field(b, ["paid_amount"]);
  const paidNet = typeof paidSoFar === "number" ? paidSoFar : undefined;
  if (pay === "refunded") return { label: "Refunded", value: price };
  if (pay === "paid") {
    if (paidNet === undefined) return { label: "Paid", value: price };
    // Paid, but refunded in full since (nothing left after refunds).
    return paidNet > 0 ? { label: "Paid", value: asMoney(paidNet) as string } : { label: "Refunded", value: price };
  }
  if ((pay === "partial" || pay === "partiallypaid") && paidNet !== undefined && paidNet > 0) {
    return { label: "Paid", value: `${asMoney(paidNet)} of ${price}` };
  }
  return { label: "Price", value: price };
}

/**
 * Exported for direct testing — these rendering rules are the part most worth exercising without
 * a live book-spa response, since field names aren't frozen yet (see studio-lookup.test.ts, which
 * feeds this a real migration-336-shaped row specifically so the names below can't silently drift
 * from what book-spa actually sends again the way they did before — "service_name"/"amount" etc.
 * were plausible-sounding guesses that matched nothing, and every booking rendered the literal
 * string "Visit" with no price until someone checked the real column names).
 *
 * Real names first in each candidate list (migration-336-marketplace-customer-lookup.sql's own
 * jsonb_build_object column list is the source of truth), older guessed names kept after as a
 * defensive fallback per the file header — not because they're expected to match anything today.
 */
export function bookingLine(b: LookupRow): { title: string; detail: string; status?: string } {
  const service = asText(field(b, ["service_name_snapshot", "service_name", "serviceName", "service", "name"])) ?? "Visit";
  const date = formatLookupDate(field(b, ["date", "booking_date", "scheduled_date", "appointment_date"]));
  const time = formatLookupTimeRange(field(b, ["start_time", "time", "booking_time", "scheduled_time"]), field(b, ["end_time"]));
  const amount = asMoney(field(b, ["final_amount", "amount", "price", "total", "amount_npr"]));
  const status = bookingStatusLabel(asText(field(b, ["status"])));
  const detail = [date, time].filter(Boolean).join(" · ") || "Date to be confirmed";
  return { title: amount ? `${service} · ${amount}` : service, detail, status };
}

export function membershipView(m: LookupRow): { tier: string; detail?: string; status?: string } {
  const tier = asText(field(m, ["tier_name", "tierName", "tier", "name", "plan_name"])) ?? "Member";
  const balance = asMoney(field(m, ["balance", "balance_npr", "remaining_balance"]));
  const status = membershipStatusLabel(asText(field(m, ["status"])));
  return { tier, detail: balance ? `Balance: ${balance}` : undefined, status };
}

/** A label/value pair for a details list. Entries whose value is absent are dropped by the
 *  builders below rather than rendered as an empty row. */
export type DetailRow = { label: string; value: string };

function rows(...entries: [string, string | undefined][]): DetailRow[] {
  return entries.filter(([, v]) => Boolean(v)).map(([label, value]) => ({ label, value: value as string }));
}

/**
 * The full membership card, as opposed to `membershipView`'s one-line summary. Four of the seven
 * fields book-spa sends (membership_number, total_deposited, activation_date, expiry_date) were
 * arriving and rendered nowhere.
 *
 * `status` is taken verbatim and never recomputed here: migration-336 derives it server-side
 * ('active' | 'pending' | 'depleted' | 'lapsed') against Asia/Kathmandu, including the expiry
 * comparison. Recomputing it from expiry_date in the browser would use the viewer's timezone and
 * disagree with the studio's own dashboard for customers travelling or abroad.
 */
export function membershipDetail(m: LookupRow): { tier: string; status?: string; rows: DetailRow[] } {
  return {
    tier: asText(field(m, ["tier_name", "tierName", "tier", "name", "plan_name"])) ?? "Member",
    status: membershipStatusLabel(asText(field(m, ["status"]))),
    rows: rows(
      ["Membership no.", asText(field(m, ["membership_number"]))],
      ["Balance", asMoney(field(m, ["balance", "balance_npr"]))],
      ["Total deposited", asMoney(field(m, ["total_deposited"]))],
      ["Activated", formatLookupDate(field(m, ["activation_date"]))],
      ["Expires", formatLookupDate(field(m, ["expiry_date"]))]
    ),
  };
}

/**
 * Packages have their own shape and their own id (`package_code`, not `booking_number`) — they
 * were previously concatenated into the bookings list and pushed through `bookingLine()`, which
 * matched none of their field names, so every package rendered as the literal "Visit · Date to be
 * confirmed".
 *
 * Sessions are the point of a package, so they're built as one string rather than three rows:
 * "3 of 10 used · 7 left" reads as a state, where three separate labelled numbers read as a form.
 */
export function packageView(p: LookupRow): { name: string; status?: string; sessions?: string; rows: DetailRow[] } {
  const total = field(p, ["sessions_total"]);
  const used = field(p, ["sessions_used"]);
  const remaining = field(p, ["sessions_remaining"]);
  const sessions =
    typeof total === "number" && typeof used === "number"
      ? `${used} of ${total} used${typeof remaining === "number" ? ` · ${remaining} left` : ""}`
      : undefined;

  return {
    name: asText(field(p, ["package_type_name", "package_name", "name"])) ?? "Package",
    status: asText(field(p, ["status"])) ? plainWords(asText(field(p, ["status"]))!) : undefined,
    sessions,
    rows: rows(
      ["Code", asText(field(p, ["package_code"]))],
      ["Issued", formatLookupDate(field(p, ["issued_date"]))],
      ["Expires", formatLookupDate(field(p, ["expiry_date"]))],
      ["Paid", asMoney(field(p, ["paid_amount"]))]
    ),
  };
}

/**
 * Vouchers arrive from migration-336 as a summary only — there is no claim-level ledger, so this
 * deliberately renders a remaining balance and nothing resembling a redemption history.
 */
export function voucherView(v: LookupRow): { code: string; remaining?: string; rows: DetailRow[] } {
  return {
    code: asText(field(v, ["voucher_code"])) ?? "Voucher",
    remaining: asMoney(field(v, ["remaining_balance"])),
    rows: rows(
      ["Issued for", asMoney(field(v, ["total_amount_issued"]))],
      ["Issued", formatLookupDate(field(v, ["issued_date"]))],
      ["Expires", formatLookupDate(field(v, ["expiry_date"]))]
    ),
  };
}

/** The studio's own word for the person who does the service (bookX's staff_label), never ours. */
function staffWord(b: LookupRow): string {
  return asText(field(b, ["staff_label"])) ?? "Staff";
}

/**
 * The full booking row, as opposed to `bookingLine`'s title/detail summary. Of the 15 fields
 * book-spa sends per booking, 3 were rendered.
 */
export function bookingDetail(b: LookupRow): {
  service: string;
  status?: string;
  when?: string;
  rows: DetailRow[];
} {
  const date = formatLookupDate(field(b, ["date", "booking_date"]));
  const time = formatLookupTimeRange(field(b, ["start_time", "time"]), field(b, ["end_time"]));
  const discount = asMoney(field(b, ["discount_amount"]));

  return {
    service: asText(field(b, ["service_name_snapshot", "service_name", "service", "name"])) ?? "Visit",
    status: bookingStatusLabel(asText(field(b, ["status"]))),
    when: [date, time].filter(Boolean).join(" · ") || undefined,
    rows: [...rows(
      ["Category", asText(field(b, ["service_category_snapshot"]))],
      ["Duration", formatLookupDuration(field(b, ["service_duration_snapshot"]))],
      [staffWord(b), asText(field(b, ["therapist_name_snapshot"]))],
      ["Room", asText(field(b, ["room_name_snapshot"]))]
    ), ...(bookingPriceRow(b) ? [bookingPriceRow(b) as DetailRow] : []), ...rows(
      // Only ever shown when non-zero: "Discount: Rs 0" on every full-price booking is noise, and
      // book-spa sends 0 rather than null for the overwhelmingly common no-discount case.
      ["Discount", typeof field(b, ["discount_amount"]) === "number" && field(b, ["discount_amount"]) !== 0 ? discount : undefined],
      ["Notes", asText(field(b, ["special_requests"]))]
    )],
  };
}

/**
 * Dedupes a list of rows (bookings, packages, or vouchers — each has its own stable id field) by
 * the given key, keeping the first occurrence. Falls back to an always-distinct key for a row
 * missing that field (a field-rename on book-spa's side — response shapes here aren't frozen, see
 * the file header) rather than dropping the row or risking a false collision between two rows
 * that both happen to be missing it.
 *
 * `fallbackCounter` is passed in rather than module-level state so each dedupe() call across
 * multiple row kinds in mergeLookupResults gets its own counter — sharing one wouldn't cause a
 * real bug (two different Maps never collide with each other's keys even at the same index), but
 * a fresh one per kind is simpler to reason about than "why do bookings and vouchers share a
 * counter".
 */
function dedupeRows(rows: LookupRow[], keyField: string, into: Map<string, LookupRow>, fallbackCounter: { n: number }) {
  for (const row of rows) {
    const id = row[keyField];
    const key = typeof id === "string" || typeof id === "number" ? `k:${id}` : `idx:${fallbackCounter.n++}`;
    if (!into.has(key)) into.set(key, row);
  }
}

/**
 * Merges several per-factor lookups at ONE org into one LookupResult — what changing a verified
 * email must not do is make a customer's history at that org vanish, so a studio page or /account
 * fans out over every verified ProfileFactor (not just the current session email) and merges here.
 *
 * Bookings dedupe on `booking_number`, packages on `package_code` — confirmed present in
 * book-spa's marketplace-customer-lookup field allow-list (migration-336) and what book-spa's own
 * UI already uses as each row's id throughout (the raw `bookings.id`/`packages.id` UUIDs are
 * deliberately not exposed by that allow-list). Packages do NOT have a `booking_number` — keying
 * them on it was a real bug (fixed here): every package took the always-distinct fallback and was
 * never deduped, so a customer with two verified emails mapping to one book-spa record saw
 * duplicate packages. Vouchers dedupe on `voucher_code`, the same shape of id. A composite key
 * (e.g. service+date+time for bookings) was considered and rejected for all three: it would
 * collapse two genuinely distinct rows that happen to share those fields, which their real id
 * fields never do.
 *
 * `membership`: picks the first non-null across the fanned-out lookups (session factor's result
 * first, in whatever order the caller passed them — callers should order session-email-first,
 * then other verified factors by verifiedAt). A SECOND, DIFFERENT membership found under another
 * factor at the same org is logged server-side (never surfaced to the customer, never merged) —
 * rare enough not to design for, but a silent pick would make it undiscoverable if it ever
 * happens.
 *
 * `totalVisits` is DERIVED from the already-merged, already-deduped `bookings` array
 * (`count(status === 'Completed')`) rather than taken from either factor's own `total_visits`
 * number. This isn't a style choice — `migration-336`'s customer match
 * (`lower(c.email) = lower(p_identifier_value)`) is against `customers.email`, a single-valued
 * column, so two DIFFERENT verified emails can never resolve to the SAME customer row: if one
 * matches, the other returns `found: false` with `total_visits: 0`. So whenever two factors both
 * report non-zero totalVisits at one org, they are necessarily two DIFFERENT customer records —
 * a duplicate book-spa client for one human — with disjoint, non-overlapping bookings. Deriving
 * from the merged list rather than merging the scalar means it can never disagree with what's
 * actually rendered beside it, which a separately-chosen merge policy (max, sum, or anything else)
 * always risks.
 *
 * `referralEarnings` has no array to derive from, so IT does need a merge policy, and by the same
 * disjointness argument SUM is correct here: two factors both reporting non-zero earnings can only
 * mean two separate customer records, each with real, non-overlapping credited earnings — nothing
 * to double-count. Logged (not an error, informational) when more than one factor contributes a
 * non-zero value, since "this customer has more than one book-spa record at this org" is worth
 * being able to find later even though summing is the right behavior for it.
 */
export function mergeLookupResults(results: LookupResult[], context?: { orgSlug?: string; userId?: string }): LookupResult {
  const found = results.some((r) => r.found);
  // True if ANY factor actually reached book-spa — one email's lookup timing out among several
  // verified factors isn't an outage, and shouldn't read as one just because it happened to be
  // first in the list.
  const reachable = results.some((r) => r.reachable);

  const bookingsByKey = new Map<string, LookupRow>();
  const packagesByKey = new Map<string, LookupRow>();
  const vouchersByKey = new Map<string, LookupRow>();
  const bookingCounter = { n: 0 };
  const packageCounter = { n: 0 };
  const voucherCounter = { n: 0 };
  for (const r of results) {
    dedupeRows(r.bookings, "booking_number", bookingsByKey, bookingCounter);
    dedupeRows(r.packages, "package_code", packagesByKey, packageCounter);
    dedupeRows(r.vouchers, "voucher_code", vouchersByKey, voucherCounter);
  }
  const bookings = [...bookingsByKey.values()];

  let membership: LookupRow | null = null;
  for (const r of results) {
    if (!r.membership) continue;
    if (membership === null) {
      membership = r.membership;
    } else if (JSON.stringify(membership) !== JSON.stringify(r.membership)) {
      console.error(
        "[studio-lookup] distinct memberships found across verified factors at one org — kept the first, logging rather than merging or surfacing",
        context?.orgSlug,
        context?.userId
      );
    }
  }

  const totalVisits = bookings.filter((b) => b.status === "Completed").length;

  const nonZeroEarnings = results.map((r) => r.referralEarnings).filter((n) => n > 0);
  const referralEarnings = nonZeroEarnings.reduce((sum, n) => sum + n, 0);
  if (nonZeroEarnings.length > 1) {
    console.error(
      "[studio-lookup] more than one verified factor reports referral earnings at one org — summed (correct: they're disjoint customer records), logging because it means this customer has more than one book-spa record here",
      context?.orgSlug,
      context?.userId
    );
  }

  return {
    found,
    reachable,
    bookings,
    packages: [...packagesByKey.values()],
    vouchers: [...vouchersByKey.values()],
    membership,
    totalVisits,
    referralEarnings,
  };
}
