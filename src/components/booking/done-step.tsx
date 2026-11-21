"use client";

import Link from "next/link";
import { bookedWhen } from "@/lib/booking/booked-summary";
import { changeOrCancelText } from "@/lib/booking/engine-errors";
import { CheckIcon } from "@/components/provider/icons";
import { dateLabel, SummaryBlock } from "@/components/provider/booking-drawer";
import { primaryButtonClass } from "./ui";
import { useBookFlow, useStoredBooked } from "./flow";

/** The booked screen. What it shows is what the studio's system replied with, never the form. */
export function DoneStep() {
  const { provider, engine, booked: live, studioPhone } = useBookFlow();
  // After a refresh the page's own memory is gone; the reply was kept for this tab.
  const stored = useStoredBooked(provider.slug);
  const booked = live ?? stored;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-primary text-primary-foreground">
        <CheckIcon width={26} height={26} strokeWidth={2} />
      </span>
      <div>
        <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">All set</p>
        <h1 className="mt-1 text-2xl font-semibold">You&apos;re booked in</h1>
        {booked?.number && <p className="mt-2 font-mono text-sm font-semibold tabular-nums">Booking number {booked.number}</p>}
      </div>
      {booked && (
        <div className="w-full text-left">
          <SummaryBlock
            provider={provider.name}
            services={booked.serviceName ? [booked.serviceName] : []}
            when={bookedWhen(booked, dateLabel)}
            total={booked.amount}
            minutes={null}
            engineProviderId={provider.engineProviderId}
            branch={engine.selectedBranch?.name ?? null}
          />
        </div>
      )}
      <p className="text-sm text-muted-foreground">{changeOrCancelText(studioPhone)}</p>
      <p className="text-xs text-muted-foreground">The studio has received your booking.</p>
      <Link href={`/providers/${provider.slug}`} className={`${primaryButtonClass} flex items-center justify-center`}>
        Done
      </Link>
    </div>
  );
}
