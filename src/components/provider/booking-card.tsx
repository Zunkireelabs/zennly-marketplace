"use client";

import { formatDuration } from "@/lib/providers";
import { ShieldIcon, StarIcon } from "./icons";
import { useProviderUi } from "./provider-shell";
import { Price } from "@/components/ui/price";

/**
 * Sticky booking card that overlaps the bottom-right edge of the hero (structure from
 * lecollectionist.com's property page; own content and tokens). Desktop only: on mobile the
 * MobileBookBar below takes over.
 */
export function BookingCard() {
  const { provider, selectedIds, selectedServices, totalPrice, totalMinutes, chooseService, openBooking } =
    useProviderUi();
  const multiple = selectedIds.length > 1;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 text-card-foreground shadow-[var(--shadow-floating)]">
      <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {provider.modality} · {provider.location}
      </p>
      <p className="mt-2 text-2xl font-normal uppercase leading-tight tracking-[0.03em]">{provider.name}</p>
      <p className="mt-2 flex items-center gap-1.5 text-sm">
        {!provider.isNew && (
          <>
            <StarIcon width={14} height={14} className="text-warning" />
            <span className="font-semibold tabular-nums">{provider.rating.toFixed(1)}</span>
          </>
        )}
        <span className="text-muted-foreground">
          {provider.isNew ? "New to Zennly" : `· ${provider.reviewCount} reviews`}
        </span>
      </p>

      <div className="mt-5 border-t border-border pt-5">
        <label htmlFor="card-service" className="text-sm font-medium">
          Service
        </label>
        {multiple ? (
          <button
            type="button"
            onClick={() => openBooking()}
            className="mt-1.5 flex h-12 w-full items-center justify-between rounded-[var(--radius-sm)] border border-border bg-card px-3 text-left text-sm transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>{selectedIds.length} services selected</span>
            <span className="text-muted-foreground">Edit</span>
          </button>
        ) : (
          <select
            id="card-service"
            value={selectedIds[0] ?? ""}
            onChange={(e) => chooseService(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">Choose a service</option>
            {provider.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {formatDuration(service.durations)} · <Price amount={service.price} engineProviderId={provider.engineProviderId} />
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        {selectedServices.length > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              Total · {formatDuration([totalMinutes])}
            </span>
            <span className="font-mono text-2xl font-semibold tabular-nums"><Price amount={totalPrice} engineProviderId={provider.engineProviderId} /></span>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">Starting from</span>
            <span className="font-mono text-2xl font-semibold tabular-nums"><Price amount={provider.fromPrice} engineProviderId={provider.engineProviderId} /></span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => openBooking()}
        className="mt-4 h-12 w-full rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Book now
      </button>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldIcon width={16} height={16} className="mt-px shrink-0" />
        Free cancellation until 24 hours before. You pay at the studio.
      </p>
    </div>
  );
}

export function MobileBookBar() {
  const { provider, selectedServices, totalPrice, openBooking } = useProviderUi();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
      <div>
        <p className="text-xs text-muted-foreground">
          {selectedServices.length > 0 ? `${selectedServices.length} selected` : "Starting from"}
        </p>
        <p className="font-mono text-lg font-semibold tabular-nums">
          <Price amount={selectedServices.length > 0 ? totalPrice : provider.fromPrice} engineProviderId={provider.engineProviderId} />
        </p>
      </div>
      <button
        type="button"
        onClick={() => openBooking()}
        className="h-12 min-w-40 rounded-[var(--radius-md)] bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Book now
      </button>
    </div>
  );
}
