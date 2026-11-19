"use client";

import { useStudioHistory } from "@/components/account/account-data-provider";
import { membershipView } from "@/lib/account/studio-lookup";

/**
 * Stub for the shell (P2) — the full membership/package/voucher field mapping (the plan's §3
 * table: balance, deposited, activation/expiry, sessions, vouchers) is P3. Reads from the SAME
 * context Appointments does, so navigating between the two triggers the shared fan-out only
 * once, not twice.
 */
export default function MembershipsPage() {
  const { connectedStudios, results, loading, unreachable } = useStudioHistory();

  return (
    <section>
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Memberships &amp; packages</h1>

      {unreachable && (
        <p className="mt-6 rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
          We couldn&rsquo;t reach the studios just now — try again in a moment.
        </p>
      )}

      {!unreachable && results === null && loading && (
        <p className="mt-6 text-sm text-muted-foreground">Loading your memberships…</p>
      )}

      {!unreachable && results !== null && (
        <ul className="mt-6 flex flex-col gap-6">
          {connectedStudios.map((studio) => {
            const r = results[studio.slug];
            const membership = r?.reachable && r.membership ? membershipView(r.membership) : null;
            return (
              <li key={studio.slug}>
                <p className="font-semibold text-foreground">{studio.name}</p>
                {!r || !r.reachable ? (
                  <p className="mt-1 text-sm text-muted-foreground">We couldn&rsquo;t reach {studio.name} just now.</p>
                ) : !membership && r.packages.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No membership or packages here yet.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {membership && (
                      <div className="rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
                        <p className="font-medium text-foreground">{membership.tier}</p>
                        {membership.detail && <p className="text-muted-foreground">{membership.detail}</p>}
                      </div>
                    )}
                    {r.packages.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {r.packages.length} package{r.packages.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
