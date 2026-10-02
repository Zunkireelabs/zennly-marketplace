"use client";

import { useState } from "react";
import Link from "next/link";
import { providerHref } from "@/lib/providers";
import Image from "next/image";
import type { RailProvider } from "@/lib/home-rails";

/**
 * "Everything in One Place" — one-stop-shop studios offering multiple services under one roof.
 *
 * Expanding-panel row (pattern from stayvista.com's "House of StayVista"): one studio is open
 * wide, showing its full service list on a dark panel over the photo; the rest collapse to slim
 * strips with the name set vertically. Hover/focus/tap opens a card. That is how "this studio
 * does all of these" gets the room it needs, instead of small pills under a small card.
 * On mobile the row scrolls sideways and the open card takes most of the width.
 *
 * Title borrows onefinestay.com's section-title device (see docs/research/refs/onefinestay.md).
 */
export function AllInOne({ providers }: { providers: RailProvider[] }) {
  const [active, setActive] = useState(0);

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
        All Under One Roof
      </h2>

      <div className="mt-6 flex h-[26rem] gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:h-[30rem] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {providers.map((provider, i) => {
          const isOpen = i === active;
          return (
            <Link
              key={provider.name}
              href={providerHref(provider.name)}
              aria-label={`${provider.name}, ${provider.location}. ${provider.modalities.join(", ")}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              // Touch: first tap opens the card, second tap follows the link.
              onClick={(e) => {
                if (!isOpen) {
                  e.preventDefault();
                  setActive(i);
                }
              }}
              className={`group relative shrink-0 overflow-hidden rounded-[var(--radius-lg)] transition-[flex-grow,width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:min-w-0 lg:basis-0 ${
                isOpen ? "w-[78vw] lg:w-auto lg:grow-[5]" : "w-20 lg:w-auto lg:grow"
              }`}
              style={{ background: provider.tone }}
            >
              {provider.image && (
                <>
                  <Image
                    src={provider.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 45vw, 80vw"
                    className="object-cover"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
                </>
              )}
              {/* Dark wash: light when open (the panel carries the contrast), stronger when
                  collapsed so the vertical name stays readable. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25 transition-opacity duration-500 ${
                  isOpen ? "opacity-70" : "opacity-100"
                }`}
              />

              {/* Collapsed strip: name set vertically. */}
              <span
                aria-hidden
                className={`absolute inset-x-0 bottom-6 flex justify-center transition-opacity duration-300 ${
                  isOpen ? "opacity-0" : "opacity-100 delay-200"
                }`}
              >
                <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.08em] text-white [writing-mode:vertical-rl] rotate-180">
                  {provider.name}
                </span>
              </span>

              {/* Open card: link arrow + service panel. */}
              <span
                aria-hidden
                className={`absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/90 text-foreground transition-opacity duration-300 ${
                  isOpen ? "opacity-100 delay-200" : "opacity-0"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

              <span
                className={`absolute inset-x-0 bottom-0 flex flex-col gap-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-5 pt-20 text-white transition-opacity duration-300 sm:flex-row sm:items-end sm:gap-6 sm:p-6 sm:pt-24 ${
                    isOpen ? "opacity-100 delay-200" : "pointer-events-none opacity-0"
                  }`}
              >
                <span className="min-w-0 sm:w-2/5">
                  <span className="block truncate text-base font-semibold uppercase tracking-[0.04em] sm:text-lg">
                    {provider.name}
                  </span>
                  <span className="block text-sm text-white/80">{provider.location}</span>
                </span>

                <span className="hidden h-24 w-px shrink-0 bg-white/30 sm:block" />

                <span className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                    <span aria-hidden>✦</span>
                    {provider.modalities.length} services, one roof
                  </span>
                  <span className="mt-3 flex flex-col gap-1.5">
                    {provider.modalities.map((modality) => (
                      <span key={modality} className="flex items-center gap-2 whitespace-nowrap text-sm sm:text-[15px]">
                        <span aria-hidden className="text-xs">✦</span>
                        {modality}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
