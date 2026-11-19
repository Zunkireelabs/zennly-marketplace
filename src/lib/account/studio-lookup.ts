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
