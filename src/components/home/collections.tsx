"use client";

import { useMemo } from "react";
import { SqueezeCarousel, type SqueezeSlide } from "@/components/ui/squeeze-carousel";
import type { CollectionTile } from "@/lib/collections";

export function Collections({ collections }: { collections: CollectionTile[] }) {
  const slides: SqueezeSlide[] = useMemo(
    () =>
      collections.map((collection) => ({
        id: collection.label,
        // No title here — the label already shows burned into the image via `overlay` below,
        // so the copy line under the carousel is just the description.
        description: collection.description,
        image: collection.image || undefined,
        imageAlt: collection.imageAlt,
        background: collection.tone,
        href: `/collections/${collection.slug}`,
        cardLabel: "Explore collection",
        // Label burned into the open panel itself, same treatment as the hero's "Stillness"
        // (font-serif/Fraunces, bold, uppercase) so the two display moments match.
        overlay: (
          <span className="font-serif text-xl font-bold uppercase leading-none tracking-wide text-white sm:text-2xl">
            {collection.label}
          </span>
        ),
      })),
    [collections],
  );

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      {/* Typography matched to DiscoveryRow's "Your Mood" / BestRated's title so all curated-rail
          headings read as siblings on the page. Two-fragment structure ("X. Defined by Y.")
          borrowed from onefinestay.com's "Selected for style. Defined by character." — device
          only, own wording (see docs/research/refs/onefinestay.md). */}
      <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
        Chosen for mood. Shaped by moment.
      </h2>

      {/* radius=12 matches --radius-md (MASTER.md); the component's own borderRadius calc
          reads this via inline style, so a Tailwind rounded-* class here would just conflict
          with it rather than apply. */}
      <SqueezeCarousel slides={slides} label="Collections" radius={12} />
    </section>
  );
}
