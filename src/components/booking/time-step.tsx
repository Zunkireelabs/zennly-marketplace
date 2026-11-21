"use client";

import { useEffect } from "react";
import { formatDuration } from "@/lib/providers";
import { earliestMissingStep } from "@/lib/booking/booking-route";
import { timeToMinutes } from "@/lib/booking/engine-availability";
import { closedDayMessage, dateLabel } from "@/components/provider/booking-drawer";
import { Notice, StepHeader, SummaryPanel } from "./ui";
import { useBookFlow } from "./flow";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const parts = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return { weekday: WEEKDAY.format(date), month: MONTH.format(date), day: d };
};

/** ③ Pick a day (a strip, today to the studio's booking window) and a time. */
export function TimeStep() {
  const { engine, params, branchReady, service, totalMinutes, days, minISO, studioPhone, go } = useBookFlow();
  const gone = params.notice === "gone";
  const { branchesLoaded } = engine;

  // Missing choices: send the customer to the first step that lacks one.
  useEffect(() => {
    if (!branchesLoaded) return;
    const missing = earliestMissingStep({ branch: params.branch, service: params.service, date: "x", time: "x" });
    if (missing !== "time" && missing !== "confirm") go(missing, params, "replace");
  }, [branchesLoaded, params, go]);

  const activeISO = params.date && params.date >= minISO ? params.date : minISO;
  const activeDay = days?.find((d) => d.date === activeISO) ?? null;
  // Past times are simply not shown; only a taken FUTURE time is struck through.
  const slots = activeDay && !activeDay.isClosed ? activeDay.slots.filter((s) => !s.isPast) : [];
  const anyFree = slots.some((s) => s.isAvailable);
  const branch = engine.selectedBranch;

  const choose = (date: string, time?: string) => branch && service && go("time", { branch: branch.id, service: service.id, date, time }, "replace");
  const next = () => branch && service && params.time && go("confirm", { branch: branch.id, service: service.id, date: activeISO, time: params.time });

  const timeOk = Boolean(params.time && slots.some((s) => s.isAvailable && timeToMinutes(s.time24) === timeToMinutes(params.time!)));
  const when = params.time && timeOk ? `${dateLabel(activeISO)} · ${slots.find((s) => timeToMinutes(s.time24) === timeToMinutes(params.time!))?.time12}` : dateLabel(activeISO);

  return (
    <div className="flex flex-col gap-8">
      <StepHeader step="time" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-8 pb-24 lg:pb-0">
          {gone && <Notice tone="error">That time is no longer available. Please pick another time.</Notice>}

          <section aria-label="Choose a day">
            <h2 className="text-2xl font-semibold">Choose a day</h2>
            {!branchReady || !days ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading days…</p>
            ) : (
              <ol className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {days.map((d) => {
                  const p = parts(d.date);
                  const selected = d.date === activeISO;
                  const full = !d.isClosed && !d.slots.some((s) => s.isAvailable);
                  const mark = d.isClosed ? "Closed" : full ? "Full" : null;
                  return (
                    <li key={d.date} className="shrink-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${dateLabel(d.date)}${mark ? `, ${mark.toLowerCase()}` : ""}`}
                        onClick={() => choose(d.date)}
                        className={`flex w-16 flex-col items-center gap-0.5 rounded-[var(--radius-md)] border px-2 py-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : mark
                              ? "border-border bg-muted text-muted-foreground"
                              : "border-border bg-card hover:border-foreground/40"
                        }`}
                      >
                        <span className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.06em]">{p.weekday}</span>
                        <span className="text-lg font-semibold tabular-nums">{p.day}</span>
                        <span className="text-[11px]">{mark ?? p.month}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-label="Choose a time">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-semibold">Choose a time</h2>
              <p className="text-xs text-muted-foreground">{formatDuration([totalMinutes])} total</p>
            </div>
            <div className="mt-4">
              {!days ? (
                <Notice>Loading times…</Notice>
              ) : activeDay?.isClosed ? (
                <Notice>{closedDayMessage(activeDay.closedReason, studioPhone)}</Notice>
              ) : slots.length === 0 || !anyFree ? (
                <Notice>{activeISO === minISO ? "No times left today. Try another day." : "No times left on this day. Try another date."}</Notice>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => {
                    const active = Boolean(params.time) && timeToMinutes(params.time!) === timeToMinutes(s.time24);
                    return (
                      <button
                        key={s.time24}
                        type="button"
                        disabled={!s.isAvailable}
                        aria-pressed={active}
                        onClick={() => choose(activeISO, s.time24.slice(0, 5))}
                        className={`rounded-[var(--radius-sm)] border px-2 py-2.5 text-sm tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : s.isAvailable
                              ? "border-border bg-card hover:border-foreground/40"
                              : "cursor-not-allowed border-transparent bg-muted text-muted-foreground/60 line-through"
                        }`}
                      >
                        {s.time12}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
        <SummaryPanel when={when} actionLabel="Continue" onAction={next} disabled={!timeOk} />
      </div>
    </div>
  );
}
