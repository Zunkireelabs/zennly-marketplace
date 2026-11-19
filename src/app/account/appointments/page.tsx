"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStudioHistory } from "@/components/account/account-data-provider";
import { bookingDetail, type DetailRow, type LookupRow } from "@/lib/account/studio-lookup";

/**
 * Every visit, across every studio, newest first — not grouped by studio. A customer thinks about
 * their appointments chronologically ("what did I have last month"), and grouping by studio makes
 * that question require reading several lists at once. Each row carries its studio instead, which
 * keeps the per-tenant fact without imposing per-tenant structure. Memberships are the opposite
 * case and are grouped, because what you hold only means anything attached to who honours it.
 *
 * Of the 15 fields book-spa sends per booking, 3 used to render. This shows the rest — see
 * bookingDetail() in studio-lookup.ts for the field-by-field mapping.
 */
type Row = { studio: string; slug: string; booking: LookupRow; sortKey: string };

export default function AppointmentsPage() {
  const { connectedStudios, results, loading, unreachable } = useStudioHistory();

  const rows = useMemo<Row[]>(() => {
    if (!results) return [];
    const out: Row[] = [];
    for (const studio of connectedStudios) {
      const r = results[studio.slug];
      if (!r?.reachable) continue;
      for (const booking of r.bookings) {
        // book-spa orders each studio's own list date DESC, but merging several studios needs a
        // re-sort. Sorting the raw ISO date/time strings lexically is correct for YYYY-MM-DD and
        // HH:MM:SS and avoids constructing Dates in the viewer's timezone — which would shift a
        // Kathmandu evening booking onto the previous day for anyone reading from the Americas.
        const date = typeof booking.date === "string" ? booking.date : "";
        const time = typeof booking.start_time === "string" ? booking.start_time : "";
        out.push({ studio: studio.name, slug: studio.slug, booking, sortKey: `${date} ${time}` });
      }
    }
    return out.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [results, connectedStudios]);

  const anyUnreachable =
    results !== null && connectedStudios.some((s) => !results[s.slug]?.reachable);

  return (
    <section>
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Appointments</h1>
      <p className="mt-2 text-sm text-muted-foreground">Every visit across the studios you&rsquo;ve booked with.</p>

      {unreachable ? (
        <p className="mt-8 rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
          We couldn&rsquo;t reach the studios just now — your bookings are safe, we simply
          can&rsquo;t read them this moment. Try again shortly.
        </p>
      ) : results === null ? (
        loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading your appointments…</p>
        ) : null
      ) : (
        <>
          {/* Partial outage: some studios answered, some didn't. Saying so matters — otherwise a
              customer whose Sbal history is missing concludes it was deleted. */}
          {anyUnreachable && rows.length > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Some studios couldn&rsquo;t be reached, so this list may be incomplete.
            </p>
          )}

          {rows.length === 0 ? (
            <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
              <p className="text-lg font-semibold">No visits yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                When you book with a studio on Zennly, your appointments will appear here.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Browse studios
              </Link>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {rows.map((row, i) => (
                <li key={`${row.slug}:${row.booking.booking_number ?? i}`}>
                  <BookingCard studio={row.studio} slug={row.slug} booking={row.booking} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function BookingCard({ studio, slug, booking }: { studio: string; slug: string; booking: LookupRow }) {
  const d = bookingDetail(booking);

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-foreground">{d.service}</p>
        {d.status && (
          <span className="shrink-0 rounded-[var(--radius-full)] bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {d.status}
          </span>
        )}
      </div>

      <p className="mt-0.5 text-sm text-muted-foreground">
        <Link href={`/providers/${slug}`} className="underline-offset-2 hover:underline">
          {studio}
        </Link>
        {d.when && <> · {d.when}</>}
      </p>

      <Rows rows={d.rows} />
    </div>
  );
}

function Rows({ rows }: { rows: DetailRow[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
