"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSaved } from "@/lib/saved/use-saved";
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon, PinIcon, StarIcon } from "@/components/provider/icons";
import { Price } from "@/components/ui/price";
import { DemoPill } from "@/components/ui/demo-pill";
import { hasRating } from "@/lib/rating";

/** The slice of a Provider a collection row needs. Kept small so the page ships little JSON. */
export type CollectionItem = {
  slug: string;
  name: string;
  city: string;
  location: string;
  modality: string;
  modalities: string[];
  rating: number;
  reviewCount: number;
  isNew: boolean;
  fromPrice: number;
  images: string[];
  blurb: string;
  amenities: string[];
  greatFor: string[];
  isDemo?: boolean;
};

const OVERLINE =
  "font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function ListingRow({ item, priority }: { item: CollectionItem; priority?: boolean }) {
  const [index, setIndex] = useState(0);
  const { saved, toggle } = useSaved(item.slug, item.name);
  const [expanded, setExpanded] = useState(false);
  const href = `/providers/${item.slug}`;
  const last = item.images.length - 1;

  const step = (dir: 1 | -1) => setIndex((i) => (i + dir + item.images.length) % item.images.length);

  return (
    <article className="grid overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card sm:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[minmax(0,320px)_1fr]">
      {/* Image carousel */}
      <div className="group/img relative aspect-[4/3] sm:aspect-auto sm:min-h-[260px]">
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 block overflow-hidden">
          {item.images.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={i === 0 ? `${item.name} studio` : ""}
              fill
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 300px, 100vw"
              priority={priority && i === 0}
              className={cn(
                "object-cover transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                i === index ? "opacity-100" : "opacity-0"
              )}
            />
          ))}
        </Link>

        {item.isNew && (
          <span className="absolute left-3 top-3 rounded-[var(--radius-full)] bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            New
          </span>
        )}

        <button
          type="button"
          onClick={toggle}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-background/90 text-foreground transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <HeartIcon className={cn("size-[18px]", saved && "fill-primary text-primary")} />
        </button>

        {last > 0 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] bg-background/90 text-foreground opacity-100 transition-opacity duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:opacity-0 sm:group-hover/img:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] bg-background/90 text-foreground opacity-100 transition-opacity duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:opacity-0 sm:group-hover/img:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronRightIcon className="size-4" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {item.images.map((src, i) => (
                <span
                  key={src}
                  className={cn(
                    "size-1.5 rounded-[var(--radius-full)] bg-background transition-opacity duration-150",
                    i === index ? "opacity-100" : "opacity-50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold leading-tight text-foreground">
              <Link href={href} className="hover:underline focus-visible:outline-none focus-visible:underline">
                {item.name}
              </Link>
              {item.isDemo && <DemoPill className="ml-2 align-middle" />}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <PinIcon className="size-4 shrink-0" />
              {item.location}
            </p>
          </div>
          {hasRating(item) && (
            <p className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
              <StarIcon className="size-4 text-warning" />
              {item.rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">({item.reviewCount})</span>
            </p>
          )}
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Services">
          {item.modalities.map((m) => (
            <li
              key={m}
              className="rounded-[var(--radius-full)] bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {m}
            </li>
          ))}
        </ul>

        <div>
          <p className={OVERLINE}>Great for</p>
          <p className="mt-1 text-sm text-foreground">{item.greatFor.slice(0, 4).join(" · ")}</p>
        </div>

        <div>
          <p
            className={cn(
              "max-w-prose text-sm leading-relaxed text-muted-foreground",
              !expanded && "line-clamp-2"
            )}
          >
            {item.blurb}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="mt-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            From{" "}
            <span className="font-[family-name:var(--font-space-mono)] text-lg font-semibold text-foreground">
              <Price amount={item.fromPrice} />
            </span>
          </p>
          <Link
            href={href}
            className="rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            View studio
          </Link>
        </div>
      </div>
    </article>
  );
}
