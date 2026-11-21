"use client";

import { useEffect, useState } from "react";
import { fetchEngineBranchHours, fetchEngineClosedRanges, type EngineBranch } from "@/lib/booking/engine-data";
import { getNepalToday } from "@/lib/booking/engine-availability";
import { branchToday, type BranchToday } from "@/lib/booking/booking-route";
import { Notice, StepHeader } from "./ui";
import { useBookFlow } from "./flow";

/** ① Choose a location. A one-branch studio never sees this: it moves straight on to Services. */
export function LocationStep() {
  const { provider, engine, params, go } = useBookFlow();
  const { branches, branchesLoaded, branchStatus } = engine;
  const [today, setToday] = useState<Record<string, BranchToday>>({});

  // One branch: nothing to choose. replace, so Back doesn't land here and bounce forward again.
  useEffect(() => {
    if (branchesLoaded && branches.length === 1) go("services", { branch: branches[0].id, service: params.service }, "replace");
  }, [branchesLoaded, branches, params.service, go]);

  // Today's hours and open/closed for each card, in Kathmandu time.
  useEffect(() => {
    if (branches.length < 2) return;
    let cancelled = false;
    const date = getNepalToday();
    Promise.all(
      branches.map(async (b) => {
        const [hours, closed] = await Promise.all([fetchEngineBranchHours(b.id), fetchEngineClosedRanges(b.id, date, date)]);
        return [b.id, branchToday(hours, closed)] as const;
      })
    ).then((entries) => {
      if (!cancelled) setToday(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [branches]);

  const pick = (b: EngineBranch) => go("services", { branch: b.id, service: params.service });

  return (
    <div className="flex flex-col gap-8">
      <StepHeader step="location" />
      <section aria-label="Choose a location">
        <h2 className="text-2xl font-semibold">Choose a location</h2>
        {!branchesLoaded || branches.length === 1 ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading locations…</p>
        ) : branches.length === 0 ? (
          <div className="mt-4">
            <Notice>Booking isn&apos;t available for {provider.name} right now. Please try again later.</Notice>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {branches.map((b) => {
              const disabled = branchStatus[b.id]?.bookable === false;
              const t = today[b.id];
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(b)}
                    className="flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card text-left text-card-foreground transition-colors duration-150 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:border-border"
                  >
                    <BranchPhoto name={b.name} url={b.photoUrl} dim={disabled} />
                    <span className="flex flex-1 flex-col gap-1 p-4">
                      <span className="text-base font-semibold">{b.name}</span>
                      {b.address && <span className="text-sm text-muted-foreground">{b.address}</span>}
                      {t?.hoursText && (
                        <span className="mt-1 flex items-center gap-2 text-sm">
                          <span className="tabular-nums">{t.hoursText}</span>
                          {t.state && !disabled && (
                            <span
                              className={`rounded-[var(--radius-full)] px-2 py-0.5 font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.06em] ${
                                t.state === "open" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {t.state === "open" ? "Open now" : "Closed"}
                            </span>
                          )}
                        </span>
                      )}
                      {disabled && <span className="mt-1 text-xs font-medium">Not taking online bookings right now</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The branch's photo from the studio's booking system, or a plain tile with its initial. */
function BranchPhoto({ name, url, dim }: { name: string; url: string | null; dim: boolean }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary studio-uploaded host; not worth an allowlist
    return <img src={url} alt="" onError={() => setFailed(true)} className={`aspect-[16/9] w-full object-cover ${dim ? "opacity-50" : ""}`} />;
  }
  return (
    <span aria-hidden="true" className="flex aspect-[16/9] w-full items-center justify-center bg-muted text-3xl font-semibold text-muted-foreground">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
