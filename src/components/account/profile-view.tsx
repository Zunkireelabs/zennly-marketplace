"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { bookingLine, membershipView, type LookupResult } from "@/lib/account/studio-lookup";

type ConnectedStudio = { slug: string; name: string; city: string; image: string };

/**
 * The cross-studio equivalent of book-spa's own /:orgSlug/account — except book-spa's version is
 * scoped to one spa, and the whole point of a marketplace account is that it isn't: one login,
 * one page, every connected studio the customer has history with. Today that's two studios;
 * this renders fine for however many are connected later.
 *
 * One request fans out server-side across every connected studio (see
 * src/app/api/account/studio-history/route.ts's providerSlugs path) rather than one call per
 * studio from here, so a customer with several studios doesn't wait on N round trips.
 *
 * No fabricated placeholders: a studio with nothing found renders a quiet "no visits yet" line,
 * the same honest empty state studio-history.tsx already uses on the storefront page. Vouchers,
 * referral earnings, and total-visit counts aren't available from any data source today, so they
 * simply aren't rendered — adding an empty-looking tile for data that doesn't exist yet would be
 * a different kind of dishonesty than the fabricated "Premium Club" this page is explicitly
 * avoiding.
 */
export function ProfileView({ connectedStudios }: { connectedStudios: ConnectedStudio[] }) {
  const { user, ready, openLogin } = useAuth();
  const [results, setResults] = useState<Record<string, LookupResult> | null>(null);

  useEffect(() => {
    if (!ready || !user || connectedStudios.length === 0) return;
    let cancelled = false;
    fetch("/api/account/studio-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerSlugs: connectedStudios.map((s) => s.slug) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.ok && json.data) setResults(json.data as Record<string, LookupResult>);
      })
      .catch(() => {
        // Fail soft: leave `results` null, which renders each studio's quiet loading line
        // indefinitely rather than an error. Same "never surface an error here" rule as
        // studio-history.tsx — this page is additive to having an account, not load-bearing.
      });
    return () => {
      cancelled = true;
    };
    // connectedStudios is server-derived and stable for the page's lifetime; re-keying on its
    // identity would refetch on every render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, connectedStudios.length]);

  if (!ready) {
    return <div aria-hidden className="h-96" />;
  }

  if (!user) {
    return (
      <section className="pt-6">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Your profile</h1>
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">You&rsquo;re not signed in</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Log in to see your bookings and membership across every studio you&rsquo;ve visited.
          </p>
          <button
            type="button"
            onClick={() => openLogin("login")}
            className="mt-5 inline-block rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Log in
          </button>
        </div>
      </section>
    );
  }

  const greetingName = user.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <section className="pt-6">
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Welcome back, {greetingName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(" · ")}</p>

      {connectedStudios.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">No connected studios yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Once a studio you&rsquo;ve booked with connects to Zennly, your visits there will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-6">
          {connectedStudios.map((studio) => (
            <li key={studio.slug}>
              <StudioCard studio={studio} result={results?.[studio.slug]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StudioCard({ studio, result }: { studio: ConnectedStudio; result: LookupResult | undefined }) {
  const membership = result?.found && result.membership ? membershipView(result.membership) : null;
  const bookings = result?.found ? [...result.bookings, ...result.packages] : [];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
      <Link href={`/providers/${studio.slug}`} className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-muted">
          {studio.image && <Image src={studio.image} alt="" fill sizes="48px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground hover:underline">{studio.name}</p>
          <p className="text-sm text-muted-foreground">{studio.city}</p>
        </div>
      </Link>

      {!result ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading your visits…</p>
      ) : (
        <>
          {membership && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Membership</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{membership.tier}</p>
              {(membership.detail || membership.status) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[membership.detail, membership.status].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          )}

          {bookings.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {bookings.map((b, i) => {
                const line = bookingLine(b);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm"
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
            <p className="mt-4 text-sm text-muted-foreground">No visits here yet.</p>
          )}
        </>
      )}
    </div>
  );
}
