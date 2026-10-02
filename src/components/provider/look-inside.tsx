"use client";

import Image from "next/image";
import { PlayIcon } from "./icons";
import { useProviderUi } from "./provider-shell";

/** "A look inside" photo grid: one large tile and four smaller, each opening the lightbox. */
export function LookInside() {
  const { provider, openGallery, openTour } = useProviderUi();
  const photos = provider.gallery.slice(0, 5);

  return (
    <section aria-labelledby="look-inside-heading" className="pt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 id="look-inside-heading" className="text-2xl font-semibold">
          A look inside
        </h2>
        <button
          type="button"
          onClick={() => openGallery(0)}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          View all photos ({provider.gallery.length})
        </button>
      </div>

      {provider.tour && (
        <button
          type="button"
          onClick={openTour}
          aria-label={`Play virtual tour of ${provider.name}`}
          className="group relative mt-5 block aspect-[21/9] w-full overflow-hidden rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Image
            src={provider.tour.poster}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 760px"
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-foreground/35" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-white/90 text-foreground transition-transform duration-200 group-hover:scale-110">
              <PlayIcon width={22} height={22} />
            </span>
            <span className="font-[family-name:var(--font-inter)] text-xs font-semibold uppercase tracking-[0.08em]">
              Virtual tour · {provider.tour.duration}
            </span>
          </span>
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => openGallery(i)}
            aria-label={`Open photo ${i + 1} of ${provider.gallery.length}`}
            className={`group relative overflow-hidden rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-[4/3]"
            }`}
          >
            <Image
              src={src}
              alt={`${provider.name}, photo ${i + 1}`}
              fill
              sizes={i === 0 ? "(max-width: 640px) 100vw, 400px" : "(max-width: 640px) 50vw, 200px"}
              className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
