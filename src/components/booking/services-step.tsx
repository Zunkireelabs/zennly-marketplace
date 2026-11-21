"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDuration } from "@/lib/providers";
import { bookUrl, notOfferedMessage, resolveServiceChoice } from "@/lib/booking/booking-route";
import { Price } from "@/components/ui/price";
import { Notice, StepHeader, SummaryPanel } from "./ui";
import { useBookFlow } from "./flow";

const FIRST_ROWS = 6;

/** ② Pick one service. The choice is kept in the URL, so a refresh or Back never loses it. */
export function ServicesStep() {
  const { provider, engine, params, branchReady, multiBranch, go } = useBookFlow();
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const branch = engine.selectedBranch;
  const { branchesLoaded, branches, servicesLoaded } = engine;

  // No branch (or one that doesn't exist) in the URL: back to Location, keeping the service.
  useEffect(() => {
    if (!branchesLoaded) return;
    if (!params.branch || !branches.some((b) => b.id === params.branch)) go("location", { service: params.service }, "replace");
  }, [branchesLoaded, branches, params.branch, params.service, go]);

  const offeredIds = engine.services.map((s) => s.id);
  const offered = provider.services.filter((s) => offeredIds.includes(s.id));
  const choice = resolveServiceChoice(params.service, offeredIds);

  // A service carried over from the studio page that this branch doesn't offer: say so, once, and
  // leave nothing selected (the URL drops it).
  useEffect(() => {
    if (!branchReady || !servicesLoaded || !branch || choice.kind !== "not-offered") return;
    const name = provider.services.find((s) => s.id === choice.serviceId)?.name ?? "That service";
    // Found out only once the branch's services have loaded, and the URL is about to drop the service,
    // so the message has to be kept here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote(notOfferedMessage(name, branch.name));
    go("services", { branch: branch.id }, "replace");
  }, [branchReady, servicesLoaded, branch, choice.kind, choice, provider.services, go]);

  const loading = !branchReady || !servicesLoaded;
  const selectedId = choice.kind === "kept" ? choice.serviceId : null;
  const visible = showAll ? offered : offered.filter((s, i) => i < FIRST_ROWS || s.id === selectedId);
  const hidden = offered.length - visible.length;

  const select = (id: string) => branch && go("services", { branch: branch.id, service: id }, "replace");
  const next = () => branch && selectedId && go("time", { branch: branch.id, service: selectedId, date: params.date });

  return (
    <div className="flex flex-col gap-8">
      <StepHeader step="services" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Choose a service" className="min-w-0 pb-24 lg:pb-0">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold">Services</h2>
            {multiBranch && branch && (
              <Link
                href={bookUrl(provider.slug, "location", { service: selectedId ?? undefined })}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Change location · {branch.name}
              </Link>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Pick one service. To book more, book them one after another.</p>

          {note && (
            <div className="mt-4">
              <Notice tone="error">{note}</Notice>
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading services…</p>
          ) : offered.length === 0 ? (
            <div className="mt-4">
              <Notice>No services can be booked online at this location right now.</Notice>
            </div>
          ) : (
            <>
              <ul role="radiogroup" aria-label="Services" className="mt-5 flex flex-col gap-2">
                {visible.map((s) => {
                  const checked = s.id === selectedId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => select(s.id)}
                        className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          checked ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/30"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-full)] border ${
                            checked ? "border-primary bg-primary" : "border-border"
                          }`}
                        >
                          {checked && <span className="h-2 w-2 rounded-[var(--radius-full)] bg-primary-foreground" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold">{s.name}</span>
                            <span className="font-mono text-sm tabular-nums">
                              <Price amount={s.price} engineProviderId={provider.engineProviderId} />
                            </span>
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{formatDuration(s.durations)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  See all {offered.length} services
                </button>
              )}
            </>
          )}
        </section>
        <SummaryPanel actionLabel="Continue" onAction={next} disabled={!selectedId} />
      </div>
    </div>
  );
}
