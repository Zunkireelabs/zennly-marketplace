"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Provider } from "@/lib/providers";

/**
 * A logged-in customer's past/upcoming bookings and membership at this studio, for
 * engine-connected providers only. Additive section: a connected provider with nothing found,
 * a logged-out visitor, or book-spa being down/slow all render the same way — quietly, never an
 * error, never a hanging spinner (src/app/api/account/studio-history/route.ts fails soft and
 * caps the upstream call at 6s).
 *
 * book-spa's response field names aren't frozen yet, so nothing here hard-depends on an exact
 * key — `field()` tries a short list of plausible names per concept and renders whatever's
 * there, so a rename on their side degrades a row's detail rather than breaking the section.
 */

type LookupRow = Record<string, unknown>;
type LookupResult = { found: boolean; bookings: LookupRow[]; membership: LookupRow | null; packages: LookupRow[] };

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

export function StudioHistory({ provider }: { provider: Provider }) {
  const { user, ready } = useAuth();
  const connected = Boolean(provider.bookingUrl);
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    if (!connected || !ready || !user) return;
    let cancelled = false;
    fetch("/api/account/studio-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerSlug: provider.slug }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.ok && json.data) setResult(json.data as LookupResult);
      })
      .catch(() => {
        // Fail soft: leave `result` null, which renders nothing. Never surface an error here —
        // this section is additive to a storefront page, not load-bearing.
      });
    return () => {
      cancelled = true;
    };
  }, [connected, ready, user, provider.slug]);

  // Nothing to show yet: not connected, not logged in, or the lookup hasn't resolved. No spinner
  // for that last case — the section simply appears once it has something to say, good or empty.
  if (!connected || !ready || !user || !result) return null;

  const membership = result.found && result.membership ? membershipView(result.membership) : null;
  const bookings = result.found ? [...result.bookings, ...result.packages] : [];

  return (
    <section id="your-visits" className="scroll-mt-20 pt-12">
      <h2 className="text-2xl font-semibold">Your visits here</h2>

      {membership && (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-primary/30 bg-primary/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Membership</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{membership.tier}</p>
          {(membership.detail || membership.status) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {[membership.detail, membership.status].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      )}

      {bookings.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {bookings.map((b, i) => {
            const line = bookingLine(b);
            return (
              <li
                key={i}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{line.title}</p>
                  <p className="text-muted-foreground">{line.detail}</p>
                </div>
                {line.status && (
                  <span className="shrink-0 rounded-[var(--radius-full)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {line.status}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!membership && bookings.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">No past visits here yet.</p>
      )}
    </section>
  );
}
