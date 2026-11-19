"use client";

import { useStudioHistory } from "@/components/account/account-data-provider";
import {
  membershipDetail,
  packageView,
  voucherView,
  type DetailRow,
  type LookupResult,
} from "@/lib/account/studio-lookup";

/**
 * Memberships, packages and vouchers, grouped by studio — because that's what they are. Fresha's
 * equivalents are platform-level (one wallet, one membership); ours belong to a studio, and a
 * customer can hold different ones at each. Flattening them would lose the only thing that makes
 * them meaningful: which studio honours them.
 *
 * Every field rendered here comes from migration-336's own jsonb_build_object column list — see
 * studio-lookup.ts's view builders. Most of this data has been arriving and rendering nowhere:
 * four of the membership's seven fields, eight of the package's nine, and vouchers entirely.
 */
export default function MembershipsPage() {
  const { connectedStudios, results, loading, unreachable } = useStudioHistory();

  return (
    <section>
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Memberships &amp; packages</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        What you hold at each studio you&rsquo;ve visited.
      </p>

      {unreachable ? (
        <Unreachable />
      ) : results === null ? (
        loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading your memberships…</p>
        ) : null
      ) : connectedStudios.length === 0 ? (
        <EmptyPanel
          title="No connected studios yet"
          body="Once a studio you've booked with connects to Zennly, your membership and packages there will show up here."
        />
      ) : (
        <ul className="mt-8 flex flex-col gap-8">
          {connectedStudios.map((studio) => (
            <li key={studio.slug}>
              <StudioHoldings name={studio.name} result={results[studio.slug]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StudioHoldings({ name, result }: { name: string; result: LookupResult | undefined }) {
  // A missing entry means we never got an answer for this studio, not that there's nothing here.
  if (!result || !result.reachable) {
    return (
      <div>
        <StudioName name={name} />
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn&rsquo;t reach {name} just now, so we can&rsquo;t show what you hold there.
        </p>
      </div>
    );
  }

  const membership = result.membership ? membershipDetail(result.membership) : null;
  const packages = result.packages.map(packageView);
  const vouchers = result.vouchers.map(voucherView);
  const nothing = !membership && packages.length === 0 && vouchers.length === 0;

  return (
    <div>
      <StudioName name={name} visits={result.totalVisits} />

      {/* Naming the studio in the empty line matters: "No membership at Nuad Thai Spa" reads as
          "we checked", where a bare "Nothing here" reads as "this section is broken" — and with
          two studios and a young customer base, empty is the normal case, not the edge one. */}
      {nothing ? (
        <p className="mt-1 text-sm text-muted-foreground">No membership, packages or vouchers at {name} yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {membership && (
            <Card tone="primary">
              <CardHead title={membership.tier} status={membership.status} />
              <Rows rows={membership.rows} />
            </Card>
          )}

          {packages.map((p, i) => (
            <Card key={p.rows.find((r) => r.label === "Code")?.value ?? i}>
              <CardHead title={p.name} status={p.status} />
              {p.sessions && <p className="mt-1 text-sm font-medium text-foreground">{p.sessions}</p>}
              <Rows rows={p.rows} />
            </Card>
          ))}

          {vouchers.map((v, i) => (
            <Card key={v.code === "Voucher" ? i : v.code}>
              <CardHead title={`Voucher ${v.code}`} />
              {v.remaining && <p className="mt-1 text-sm font-medium text-foreground">{v.remaining} remaining</p>}
              <Rows rows={v.rows} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StudioName({ name, visits }: { name: string; visits?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-semibold text-foreground">{name}</p>
      {typeof visits === "number" && visits > 0 && (
        <p className="shrink-0 text-xs text-muted-foreground">
          {visits} visit{visits === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function Card({ tone, children }: { tone?: "primary"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-md)] border px-4 py-3 ${
        tone === "primary" ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      {children}
    </div>
  );
}

function CardHead({ title, status }: { title: string; status?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-medium text-foreground">{title}</p>
      {status && (
        <span className="shrink-0 rounded-[var(--radius-full)] bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
          {status}
        </span>
      )}
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

function Unreachable() {
  return (
    <p className="mt-8 rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
      We couldn&rsquo;t reach the studios just now — your memberships are safe, we simply
      can&rsquo;t read them this moment. Try again shortly.
    </p>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
