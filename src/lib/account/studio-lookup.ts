/**
 * Shared shape + rendering rules for book-spa's marketplace-customer-lookup response, used by
 * both the per-studio "Your visits here" section (studio-history.tsx) and the cross-studio
 * profile page. book-spa's response field names aren't frozen yet, so nothing here hard-depends
 * on an exact key — `field()` tries a short list of plausible names per concept and renders
 * whatever's there, so a rename on their side degrades a row's detail rather than breaking the
 * section entirely.
 */

export type LookupRow = Record<string, unknown>;
export type LookupResult = { found: boolean; bookings: LookupRow[]; membership: LookupRow | null; packages: LookupRow[] };

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

/** Exported for direct testing — these rendering rules are the part most worth exercising
 * without a live book-spa response, since field names aren't frozen yet. */
export function bookingLine(b: LookupRow): { title: string; detail: string; status?: string } {
  const service = asText(field(b, ["service_name", "serviceName", "service", "name"])) ?? "Visit";
  const date = asText(field(b, ["date", "booking_date", "scheduled_date", "appointment_date"]));
  const time = asText(field(b, ["time", "booking_time", "scheduled_time", "start_time"]));
  const amount = asMoney(field(b, ["amount", "price", "total", "amount_npr"]));
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
 * Merges several per-factor lookups at ONE org into one LookupResult — what changing a verified
 * email must not do is make a customer's history at that org vanish, so a studio page or /account
 * fans out over every verified ProfileFactor (not just the current session email) and merges here.
 *
 * Dedupes bookings/packages on `booking_number` — confirmed present in book-spa's
 * marketplace-customer-lookup field allow-list (migration-336) and what book-spa's own UI already
 * uses as a booking's id throughout. The raw `bookings.id` UUID is deliberately not exposed by
 * that allow-list. A composite key (service+date+time) was considered and rejected: it would
 * collapse two genuinely distinct bookings that happen to share all three, which booking_number
 * never does. If a row is ever missing booking_number (a field-rename on book-spa's side —
 * response shapes here aren't frozen, see the file header), it falls back to an always-distinct
 * key rather than dropping the row or risking a false collision.
 *
 * `membership`: picks the first non-null across the fanned-out lookups (session factor's result
 * first, in whatever order the caller passed them — callers should order session-email-first,
 * then other verified factors by verifiedAt). A SECOND, DIFFERENT membership found under another
 * factor at the same org is logged server-side (never surfaced to the customer, never merged) —
 * rare enough not to design for, but a silent pick would make it undiscoverable if it ever
 * happens.
 */
export function mergeLookupResults(results: LookupResult[], context?: { orgSlug?: string; userId?: string }): LookupResult {
  const found = results.some((r) => r.found);

  let fallbackIndex = 0;
  const dedupe = (rows: LookupRow[], into: Map<string, LookupRow>) => {
    for (const row of rows) {
      const bn = row.booking_number;
      const key = typeof bn === "string" || typeof bn === "number" ? `bn:${bn}` : `idx:${fallbackIndex++}`;
      if (!into.has(key)) into.set(key, row);
    }
  };
  const bookingsByKey = new Map<string, LookupRow>();
  const packagesByKey = new Map<string, LookupRow>();
  for (const r of results) {
    dedupe(r.bookings, bookingsByKey);
    dedupe(r.packages, packagesByKey);
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

  return { found, bookings: [...bookingsByKey.values()], packages: [...packagesByKey.values()], membership };
}
