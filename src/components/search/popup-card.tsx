"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSaved } from "@/lib/saved/use-saved";
import { CloseIcon, HeartIcon } from "@/components/provider/icons";
import type { SearchResult } from "@/lib/search";
import { Price } from "@/components/ui/price";
import { DemoPill } from "@/components/ui/demo-pill";
import { hasRating } from "@/lib/rating";

const ROUND =
  "flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** A studio's card on the map: opens on pin hover, and stays open once the pin is clicked. */
export function PopupCard({
  studio,
  below,
  onClose,
}: {
  studio: SearchResult;
  /** Open under the pin instead of above it, when the pin is near the top of the map. */
  below: boolean;
  onClose: () => void;
}) {
  const { saved, toggle } = useSaved(studio.slug, studio.name);
  return (
    <div className={cn("absolute left-1/2 z-20 w-64 -translate-x-1/2 cursor-default", below ? "top-full pt-3" : "bottom-full pb-3")}>
      <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-card text-left shadow-[var(--shadow-floating)]">
        <Link href={`/providers/${studio.slug}`} className="block">
          <span className="relative block h-32 w-full bg-muted">
            <Image src={studio.image} alt="" fill sizes="256px" className="object-cover" />
          </span>
          <span className="block p-3">
            <span className="block truncate text-sm font-medium text-foreground">
              {studio.name}
              {!studio.engineProviderId && <DemoPill className="ml-2 align-middle" />}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {studio.modality} · {studio.city}, {studio.region}
            </span>
            <span className="mt-1.5 block text-xs text-foreground">
              {studio.isNew ? "New to Zennly · " : hasRating(studio) ? `★ ${studio.rating.toFixed(1)} (${studio.reviewCount}) · ` : ""}from{" "}
              <Price amount={studio.fromPrice} engineProviderId={studio.engineProviderId} />
            </span>
          </span>
        </Link>
        <div className="absolute right-2 top-2 flex gap-1.5">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${studio.name} from saved` : `Save ${studio.name}`}
            className={ROUND}
          >
            <HeartIcon className={cn("size-4", saved && "fill-primary text-primary")} />
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className={ROUND}>
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
