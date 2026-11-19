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
  if (typeof value === "number") return `Rs ${value.toLocaleString("en-IN")}`;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
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
  const date = asText(field(b, ["date", "booking_date", "scheduled_date", "appointment_date"]));
  const time = asText(field(b, ["start_time", "time", "booking_time", "scheduled_time"]));
  const amount = asMoney(field(b, ["final_amount", "amount", "price", "total", "amount_npr"]));
  const status = asText(field(b, ["status"]));
  const detail = [date, time].filter(Boolean).join(" · ") || "Date to be confirmed";
  return { title: amount ? `${service} · ${amount}` : service, detail, status };
}

export function membershipView(m: LookupRow): { tier: string; detail?: string; status?: string } {
  const tier = asText(field(m, ["tier_name", "tierName", "tier", "name", "plan_name"])) ?? "Member";
  const balance = asMoney(field(m, ["balance", "balance_npr", "remaining_balance"]));
  const status = asText(field(m, ["status"]));
  return { tier, detail: balance ? `Balance: ${balance}` : undefined, status };
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
 * `totalVisits`/`referralEarnings`: both scalars, not arrays, so they can't be deduped by key the
 * way rows are. Takes the MAX across factors rather than summing. Reasoning: if two verified
 * emails resolve to the SAME book-spa customer record (the common case — a customer who simply
 * changed their marketplace login email once), book-spa returns the IDENTICAL number from both
 * lookups, and summing would double it — a visible, confusing bug ("why does it say 24 visits
 * when I've been 12 times") for the exact case this fan-out exists to support correctly. Summing
 * would only be right if two emails resolved to two genuinely DIFFERENT customer records at the
 * same org (rare, and the undercounting MAX produces there is the quieter failure of the two). A
 * genuine difference between factors is logged, same treatment as the membership conflict above,
 * for the same reason: a silent pick would make a real discrepancy undiscoverable.
 */
export function mergeLookupResults(results: LookupResult[], context?: { orgSlug?: string; userId?: string }): LookupResult {
  const found = results.some((r) => r.found);

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

  let totalVisits = 0;
  let referralEarnings = 0;
  let visitsDiffered = false;
  let earningsDiffered = false;
  for (const r of results) {
    if (totalVisits > 0 && r.totalVisits > 0 && r.totalVisits !== totalVisits) visitsDiffered = true;
    if (referralEarnings > 0 && r.referralEarnings > 0 && r.referralEarnings !== referralEarnings) earningsDiffered = true;
    totalVisits = Math.max(totalVisits, r.totalVisits);
    referralEarnings = Math.max(referralEarnings, r.referralEarnings);
  }
  if (visitsDiffered || earningsDiffered) {
    console.error(
      "[studio-lookup] total_visits/referral_earnings differed across verified factors at one org — kept the max, logging rather than summing or surfacing",
      context?.orgSlug,
      context?.userId
    );
  }

  return {
    found,
    bookings: [...bookingsByKey.values()],
    packages: [...packagesByKey.values()],
    vouchers: [...vouchersByKey.values()],
    membership,
    totalVisits,
    referralEarnings,
  };
}
