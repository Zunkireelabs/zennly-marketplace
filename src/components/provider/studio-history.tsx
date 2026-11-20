"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Provider } from "@/lib/providers";
import { bookingLine, membershipView, type LookupResult } from "@/lib/account/studio-lookup";

/**
 * A logged-in customer's past/upcoming bookings and membership at this studio, for
 * engine-connected providers only. Additive section: a connected provider with nothing found,
 * a logged-out visitor, or book-spa being down/slow all render the same way — quietly, never an
 * error, never a hanging spinner (src/app/api/account/studio-history/route.ts fails soft and
 * caps the upstream call at 6s).
 *
 * The rendering rules (field-name matching, since book-spa's response shape isn't frozen yet)
 * live in src/lib/account/studio-lookup.ts, shared with the cross-studio profile page.
 */

/** Enough to say "you have been here before" without becoming a history page. */
const VISIT_PREVIEW_COUNT = 3;

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
  const allBookings = result.found ? result.bookings : [];
  // This is a studio page, not an account page: the job here is to remind a returning customer
  // they've been before, not to be their booking history. A regular with forty visits pushed the
  // studio's own content off the screen entirely. /account/appointments is where the full list
  // lives, across every studio, so link there rather than growing this.
  const bookings = allBookings.slice(0, VISIT_PREVIEW_COUNT);
  const hiddenCount = allBookings.length - bookings.length;

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

      {hiddenCount > 0 && (
        <Link
          href="/account/appointments"
          className="mt-3 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          View all {allBookings.length} visits
        </Link>
      )}

      {!membership && bookings.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">No past visits here yet.</p>
      )}
    </section>
  );
}
