"use client";

import Link from "next/link";
import { providerHref } from "@/lib/providers";
import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { HomeRails } from "@/lib/home-rails";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

// Split around the centered title, matching the lecollectionist.com "Our Homes" structural
// reference (tabs flanking a centered heading, own copy/data — see DESIGN_ORCHESTRATOR.md's
// reference principle). 4 intents, 2 left / 2 right — "Glow" (beauty: hair, lash/brow, skin)
// sits alongside the wellness intents so the rail isn't spa-only.
export function DiscoveryRow({ intents }: { intents: HomeRails["discoveryIntents"] }) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = intents[activeIndex];
  const LEFT_TABS = intents.slice(0, 2);
  const RIGHT_TABS = intents.slice(2);

  const renderTab = (intent: (typeof intents)[number]) => {
    const index = intents.indexOf(intent);
    const isActive = index === activeIndex;
    return (
      <button
        key={intent.label}
        type="button"
        aria-pressed={isActive}
        onClick={() => setActiveIndex(index)}
        className="group flex cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className={`px-5 font-[family-name:var(--font-inter)] text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-sm ${
            isActive
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {intent.label}
        </span>
        {/* Underline — solid for the active tab, and now slides in from the center on hover
            for inactive tabs too (scaleX, not just an opacity fade). */}
        <span
          className={`h-px w-full origin-center bg-foreground transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          }`}
        />
      </button>
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      {/* Grid (not flex justify-between) so the title sits dead-center regardless of the
          left/right tab groups having different widths (2 tabs vs 3) — matching exactly
          where lecollectionist.com's title sits relative to its own uneven tab groups.
          justify-between (not justify-end/start) on each side column so the outermost tab
          (Unwind / Center) lands exactly at the section's own edge — same left/right margin
          as the provider-card grid below, so the two rows read as equal width. */}
      <div className="grid grid-cols-1 items-center gap-y-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-8">
        {/* Unwind flush at the far edge; Restore wrapped in a flex-1 justify-center cell so
            it lands at the true visual midpoint between Unwind and the title, not just
            flush against the title (justify-between pushed it too close, per feedback). */}
        <div className="order-2 flex items-center justify-center gap-8 sm:order-1 sm:justify-between sm:gap-0">
          {renderTab(LEFT_TABS[0])}
          <div className="sm:hidden">{renderTab(LEFT_TABS[1])}</div>
          <div className="hidden flex-1 justify-center sm:flex">
            {renderTab(LEFT_TABS[1])}
          </div>
        </div>
        {/* Weight/size/line-height matched to the reference's title metrics (400/32px/45px) —
            the reference's actual typeface ("Brown") is a paid commercial font we don't have
            rights to embed, so this stays on our own Geist at the same proportions. */}
        <h2 className="order-1 px-8 text-center text-2xl font-normal leading-[1.4] text-foreground sm:order-2 sm:px-12 sm:text-[32px] sm:leading-[45px]">
          Your Mood
        </h2>
        {/* Mirrors the left group: Glow centered between the title and Center, Center
            flush at the far edge. */}
        <div className="order-3 flex items-center justify-center gap-8 sm:justify-between sm:gap-0">
          <div className="sm:hidden">{renderTab(RIGHT_TABS[0])}</div>
          <div className="hidden flex-1 justify-center sm:flex">
            {renderTab(RIGHT_TABS[0])}
          </div>
          {renderTab(RIGHT_TABS[1])}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.label}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_STANDARD }}
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3"
        >
          {active.providers.map((provider) => (
            <Link
              key={provider.name}
              href={providerHref(provider.name)}
              className="group flex flex-col gap-3 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Aspect ratio (3:4) measured directly off lecollectionist.com's card markup
                  (400x533px images) — narrower/taller than our previous 4:5. overflow-hidden
                  wrapper clips the hover zoom so it doesn't spill past the rounded corners. */}
              <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)]">
                {provider.image ? (
                  <span className="block h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                    <Image
                      src={provider.image}
                      alt={`${provider.name} studio`}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                    {/* Same minimal accent tint used on the hero — a flat, direct wash (not just
                        a blended vignette) so these cards read as one visual system with it. */}
                    <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
                  </span>
                ) : (
                  <span
                    className="block h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    style={{ background: provider.tone }}
                  />
                )}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold uppercase tracking-[0.04em] text-foreground group-hover:underline">
                  {provider.name}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {provider.location}
                </span>
              </span>
            </Link>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
