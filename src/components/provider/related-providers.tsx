"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { RailArrows } from "@/components/ui/rail-arrows";
import { providerHref, type Provider } from "@/lib/providers";
import { DemoPill } from "@/components/ui/demo-pill";
import { hasRating } from "@/lib/rating";

/** "More like this" rail. Client component so the prev/next arrows can scroll the rail. */
export function RelatedProviders({ related }: { related: Provider[] }) {
  const rail = useRef<HTMLDivElement>(null);

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16" aria-labelledby="related-heading">
      <div className="flex items-end justify-between gap-4">
        <h2 id="related-heading" className="text-2xl font-normal leading-[1.4] sm:text-[32px] sm:leading-[45px]">
          More like this
        </h2>
        <RailArrows railRef={rail} label="studios" />
      </div>
      <div
        ref={rail}
        className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {related.map((p) => (
          <Link
            key={p.slug}
            href={providerHref(p.name)}
            className="group flex w-56 shrink-0 flex-col gap-3 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)]">
              <span className="block h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                <Image src={p.image} alt={`${p.name} studio`} fill sizes="224px" className="object-cover" />
                <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
              </span>
              {(p.isNew || hasRating(p)) && (
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-[var(--radius-full)] bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">
                  {p.isNew ? "New" : `★ ${p.rating.toFixed(1)}`}
                </span>
              )}
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold uppercase tracking-[0.04em] text-foreground group-hover:underline">
                {p.name}
                {!p.engineProviderId && <DemoPill className="ml-2 align-middle" />}
              </span>
              <span className="block text-sm text-muted-foreground">
                {p.modality} · {p.location}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
