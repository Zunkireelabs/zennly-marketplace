"use client";

import Link from "next/link";
import { providerHref } from "@/lib/providers";
import { useMemo, useRef, useState } from "react";
import { RailArrows } from "@/components/ui/rail-arrows";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { RailProvider } from "@/lib/home-rails";
import { DemoPill } from "@/components/ui/demo-pill";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

type ViewMode = "modality" | "location";

export function BestRated({
  providers: allProviders,
  modalities,
  locations,
}: {
  providers: RailProvider[];
  modalities: string[];
  locations: string[];
}) {
  const reduceMotion = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>("modality");
  const [filter, setFilter] = useState("All");

  const tabs = mode === "modality" ? modalities : locations;

  const providers = useMemo(() => {
    if (filter === "All") return allProviders;
    return allProviders.filter((p) =>
      mode === "modality"
        ? p.modality === filter
        : p.location.startsWith(filter),
    );
  }, [allProviders, mode, filter]);

  const switchMode = (next: ViewMode) => {
    if (next === mode) return;
    setMode(next);
    setFilter("All");
  };

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Typography matched to DiscoveryRow's "Your Mood" title (same weight/size/line-height
            metrics) so the two curated-rail headings read as siblings on the page. */}
        <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
          Every Studio, Every City
        </h2>

        {/* Segmented pill toggle — active side is a sliding solid pill (layoutId), distinct
            from the underline-style tabs below it so it reads as "which axis", not "which value". */}
        <div className="inline-flex h-11 w-fit shrink-0 items-center rounded-[var(--radius-full)] bg-muted p-1">
          {(["modality", "location"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => switchMode(value)}
              className="relative min-h-[36px] cursor-pointer rounded-[var(--radius-full)] px-4 font-[family-name:var(--font-inter)] text-xs font-semibold uppercase tracking-[0.06em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {mode === value && (
                <motion.span
                  layoutId="best-rated-toggle-pill"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.25, ease: EASE_STANDARD }
                  }
                  className="absolute inset-0 rounded-[var(--radius-full)] bg-background shadow-sm"
                />
              )}
              <span
                className={`relative ${mode === value ? "text-foreground" : "text-muted-foreground"}`}
              >
                {value === "modality" ? "By Modality" : "By Location"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs — swaps content per mode, crossfades like DiscoveryRow's tab switch. The
          rail arrows share this row, right-aligned. */}
      <div className="mt-6 flex items-center justify-between gap-4">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_STANDARD }}
          className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = tab === filter;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(tab)}
                className={`min-h-[36px] shrink-0 cursor-pointer rounded-[var(--radius-full)] border px-4 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
      <RailArrows railRef={rail} label="studios" />
      </div>

      {/* Horizontal scroll rail — same shape as Collections (overflow-x-auto, hidden scrollbar,
          shrink-0 cards) with peek/overflow signaling scrollability, per the StayVista DNA's
          card-rail finding (docs/research/refs/stayvista-design-dna.json). */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          ref={rail}
          key={`${mode}-${filter}`}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_STANDARD }}
          className="mt-5 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {providers.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">
              No providers match this filter yet.
            </p>
          ) : (
            providers.map((provider) => (
              <Link
                key={provider.name}
                href={providerHref(provider.name)}
                className="group flex w-56 shrink-0 flex-col gap-3 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)]">
                  {provider.image ? (
                    <span className="block h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                      <Image
                        src={provider.image}
                        alt={`${provider.name} studio`}
                        fill
                        sizes="224px"
                        className="object-cover"
                      />
                      {/* Same minimal accent tint used on the hero and DiscoveryRow cards, so
                          this rail reads as the same visual system rather than a separate one. */}
                      <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
                    </span>
                  ) : (
                    <span
                      className="block h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      style={{ background: provider.tone }}
                    />
                  )}
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-[var(--radius-full)] bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">
                    ★ {provider.rating.toFixed(1)}
                  </span>
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold uppercase tracking-[0.04em] text-foreground group-hover:underline">
                    {provider.name}
                    {provider.isDemo && <DemoPill className="ml-2 align-middle" />}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {provider.location}
                  </span>
                </span>
              </Link>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
