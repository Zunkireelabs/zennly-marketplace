"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { RailArrows } from "@/components/ui/rail-arrows";
import { providerHref } from "@/lib/providers";
import type { NewRailProvider } from "@/lib/home-rails";

/**
 * "New to Zennly" — recently-joined studios, platform-wide. Same card shape/rail pattern as
 * BestRated (horizontal scroll, hidden scrollbar, hover zoom) but no filter tabs and a "NEW"
 * badge instead of a rating, since these studios haven't accrued reviews yet.
 *
 * Title borrows onefinestay.com's section-title device — a short phrase naming the theme
 * (their "Just In" for new listings) — structure/device only, own copy (see
 * DESIGN_ORCHESTRATOR.md reference principle; docs/research/refs/onefinestay.md). No subcopy
 * line, matching DiscoveryRow/BestRated's title-only convention above it.
 */
export function NewToZennly({ providers }: { providers: NewRailProvider[] }) {
  const rail = useRef<HTMLDivElement>(null);

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
          Newly Welcomed
        </h2>
        <RailArrows railRef={rail} label="studios" />
      </div>

      <div ref={rail} className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {providers.map((provider) => (
          <Link
            key={provider.name}
            href={providerHref(provider.name)}
            className="group flex w-56 shrink-0 flex-col gap-3 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)]">
              <span
                className="block h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                style={{ background: provider.tone }}
              >
                {provider.image && (
                  <>
                    <Image
                      src={provider.image}
                      alt={`${provider.name} studio`}
                      fill
                      sizes="224px"
                      className="object-cover"
                    />
                    {/* Same accent tint as the BestRated cards. */}
                    <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
                  </>
                )}
              </span>
              <span className="absolute left-3 top-3 rounded-[var(--radius-full)] bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-accent-foreground">
                New
              </span>
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold uppercase tracking-[0.04em] text-foreground group-hover:underline">
                {provider.name}
              </span>
              <span className="block text-sm text-muted-foreground">
                {provider.modality} · {provider.location}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground/80">
                {provider.joinedLabel}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
