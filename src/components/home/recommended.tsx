import Link from "next/link";
import { providerHref } from "@/lib/providers";
import Image from "next/image";
import type { RailProvider } from "@/lib/home-rails";
import { DemoPill } from "@/components/ui/demo-pill";

/**
 * "Recommended" — editorial picks, pulled from the same provider data as the "Every Studio,
 * Every City" section (its `isRecommended` studios, see lib/home-rails.ts), not a disjoint cast. Own
 * section (not a badge on those cards) per user direction 2026-09-28 — sits above the full
 * list as a "start here" rail. No filter toggle, no subcopy — same title-only convention as
 * NewToZennly/AllInOne, itself borrowed from onefinestay.com's section-title device (see
 * docs/research/refs/onefinestay.md) — plain text, no italics per later revision.
 */
export function Recommended({ providers }: { providers: RailProvider[] }) {
  if (providers.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
        Handpicked for You
      </h2>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {providers.map((provider) => (
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
                {provider.modality} · {provider.location}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
