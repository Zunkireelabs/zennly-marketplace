"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/providers";
import { AmenityIcon } from "./amenity-icons";
import { useProviderUi } from "./provider-shell";
import { Price } from "@/components/ui/price";

export function ServicesSection() {
  const { provider, openBooking } = useProviderUi();
  const [category, setCategory] = useState(provider.serviceCategories[0]);
  const rows = provider.services.filter((s) => s.category === category);

  return (
    <section id="services" className="scroll-mt-20 pt-12">
      <h2 className="text-2xl font-semibold">Services</h2>

      <div
        role="tablist"
        aria-label="Service categories"
        className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {provider.serviceCategories.map((name) => {
          const active = name === category;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(name)}
              className={`min-h-[36px] shrink-0 rounded-[var(--radius-full)] border px-4 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-muted text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      <ul className="mt-5 flex flex-col divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-card">
        {rows.map((service) => (
          <li key={service.id} className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">{service.name}</h3>
              {formatDuration(service.durations) && (
                <p className="mt-0.5 text-sm text-muted-foreground">{formatDuration(service.durations)}</p>
              )}
              <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{service.description}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-3">
              {/* One price: what the studio's booking system charges with no staff chosen. */}
              <p className="font-mono text-base font-semibold tabular-nums">
                <Price amount={service.price} engineProviderId={provider.engineProviderId} />
              </p>
              <button
                type="button"
                onClick={() => openBooking({ serviceId: service.id })}
                aria-label={`Book ${service.name}`}
                className="h-10 rounded-[var(--radius-md)] border-[1.5px] border-primary px-5 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Book
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* `included` and `addOns` are seeded placeholder content. book-spa's services RPC supplies
          neither, so for engine-connected providers these would render invented extras (and in USD)
          next to the studio's real catalogue. Hide the whole block for them rather than show
          fabricated items on a real business's page; demo providers keep it. */}
      {!provider.engineProviderId && (
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Included with every visit
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {provider.included.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <AmenityIcon name={item} width={20} height={20} className="mt-px shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Optional extras
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {provider.addOns.map((item) => (
              <li key={item.name} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-start gap-2.5">
                  <AmenityIcon name={item.name} width={20} height={20} className="mt-px shrink-0 text-primary" />
                  {item.name}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {item.price === 0 ? "Free" : <>+<Price amount={item.price} /></>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      )}
    </section>
  );
}
