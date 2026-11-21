"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/providers";
import { previousStep, stepsFor, type BookStep } from "@/lib/booking/booking-route";
import { SummaryBlock } from "@/components/provider/booking-drawer";
import { ChevronLeftIcon } from "@/components/provider/icons";
import { Price } from "@/components/ui/price";
import { useBookFlow } from "./flow";

/* Marketplace tokens only (same classes as the studio page and the drawer's pieces). */
export const primaryButtonClass =
  "h-12 w-full rounded-[var(--radius-md)] bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

export function Notice({ children, tone = "muted", role = "status" }: { children: React.ReactNode; tone?: "muted" | "error"; role?: "status" | "alert" }) {
  return (
    <p
      role={role}
      className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${tone === "error" ? "border border-error" : "bg-muted text-muted-foreground"}`}
    >
      {children}
    </p>
  );
}

/** "Step n of N" micro-label, the segmented bar, and Back — the same look as the drawer's header. */
export function StepHeader({ step }: { step: Exclude<BookStep, "done"> }) {
  const { provider, multiBranch, params, go, locked } = useBookFlow();
  const steps = stepsFor(multiBranch);
  const index = Math.max(0, steps.findIndex((s) => s.id === step));
  const prev = previousStep(step, multiBranch);
  const backHref = prev ? null : `/providers/${provider.slug}`;

  const backClass =
    "-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <div>
      <div className="flex items-center gap-3">
        {/* Once a send may have booked, Back would let the inputs change under it. */}
        {!locked &&
          (backHref ? (
            <Link href={backHref} aria-label={`Back to ${provider.name}`} className={backClass}>
              <ChevronLeftIcon />
            </Link>
          ) : (
            <button type="button" aria-label="Back" onClick={() => prev && go(prev, params)} className={backClass}>
              <ChevronLeftIcon />
            </button>
          ))}
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Step {index + 1} of {steps.length}
          </p>
        </div>
      </div>
      <ol className="mt-4 flex gap-1" aria-label="Booking steps">
        {steps.map((s, i) => (
          <li key={s.id} className="flex-1">
            <span className={`block h-1 rounded-[var(--radius-full)] ${i <= index ? "bg-primary" : "bg-muted"}`} />
            <span className={`mt-1.5 block text-xs ${i === index ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Summary card on desktop, sticky bar with the total and the button on a phone. `form` makes the
 * button submit that form (the confirm step); otherwise it calls `onAction`.
 */
export function SummaryPanel({
  when,
  actionLabel,
  onAction,
  form,
  disabled,
  children,
}: {
  when?: string | null;
  actionLabel: string;
  onAction?: () => void;
  form?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const { provider, service, totalMinutes, engine } = useBookFlow();
  const branch = engine.selectedBranch;
  const total = service?.price ?? 0;
  const button = (
    <button
      type={form ? "submit" : "button"}
      form={form}
      onClick={form ? undefined : onAction}
      disabled={disabled}
      className={primaryButtonClass}
    >
      {actionLabel}
    </button>
  );
  return (
    <>
      <aside className="hidden lg:block" aria-label="Your booking">
        <div className="sticky top-6 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-floating)]">
          {/* Reserved height, so the button below stays put when a service or time is picked. */}
          <div className="min-h-[17rem]">
          <SummaryBlock
            provider={provider.name}
            branch={branch ? [branch.name, branch.address].filter(Boolean).join(" · ") : null}
            services={service ? [service.name] : []}
            when={when ?? null}
            total={service ? total : null}
            minutes={service ? totalMinutes : null}
            engineProviderId={provider.engineProviderId}
          />
          </div>
          {children}
          {button}
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            {service ? `${service.name} · ${formatDuration([totalMinutes])}` : "No service selected"}
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums">
            <Price amount={total} engineProviderId={provider.engineProviderId} />
          </p>
        </div>
        <div className="w-40 shrink-0">{button}</div>
      </div>
    </>
  );
}
