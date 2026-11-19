"use client";

import { useStudioHistory } from "@/components/account/account-data-provider";
import { bookingLine } from "@/lib/account/studio-lookup";

/**
 * Stub for the shell (P2) — the full field-by-field booking table (service, duration, therapist,
 * room, discount — see the plan's §3) is P3. This exists to prove the shared-fetch shape works:
 * calling useStudioHistory() here (and in Memberships) is what triggers the ONE shared fan-out,
 * and what the reachable/unreachable split actually renders.
 */
export default function AppointmentsPage() {
  const { connectedStudios, results, loading, unreachable } = useStudioHistory();

  return (
    <section>
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Appointments</h1>

      {unreachable && (
        <p className="mt-6 rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
          We couldn&rsquo;t reach the studios just now — try again in a moment.
        </p>
      )}

      {!unreachable && results === null && loading && (
        <p className="mt-6 text-sm text-muted-foreground">Loading your appointments…</p>
      )}

      {!unreachable && results !== null && (
        <ul className="mt-6 flex flex-col gap-6">
          {connectedStudios.map((studio) => {
            const r = results[studio.slug];
            return (
              <li key={studio.slug}>
                <p className="font-semibold text-foreground">{studio.name}</p>
                {!r || !r.reachable ? (
                  <p className="mt-1 text-sm text-muted-foreground">We couldn&rsquo;t reach {studio.name} just now.</p>
                ) : r.bookings.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No visits here yet.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {r.bookings.map((b, i) => {
                      const line = bookingLine(b);
                      return (
                        <li key={i} className="rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm">
                          <p className="font-medium text-foreground">{line.title}</p>
                          <p className="text-muted-foreground">{line.detail}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
