"use client";

import { toast } from "sonner";
import { pillClass } from "@/components/ui/pill";
import { useSaved } from "@/lib/saved/use-saved";
import { CubeIcon, HeartIcon, ImagesIcon, ShareIcon } from "./icons";
import { useProviderUi } from "./provider-shell";

const HERO_BTN =
  "flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-foreground/80 px-5 font-[family-name:var(--font-inter)] text-xs font-semibold uppercase tracking-[0.08em] text-white backdrop-blur transition-colors duration-150 hover:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/** Buttons that sit on the hero photo, bottom-left ("View all photos", "Virtual tour"). */
export function HeroPhotoButton() {
  const { provider, openGallery, openTour } = useProviderUi();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => openGallery(0)} className={HERO_BTN}>
        <ImagesIcon width={18} height={18} />
        View all photos ({provider.gallery.length})
      </button>
      {provider.tour && (
        <button type="button" onClick={openTour} className={HERO_BTN}>
          <CubeIcon width={18} height={18} />
          Virtual tour
        </button>
      )}
    </div>
  );
}

/** Save and share, next to the page title. Saves live on the device until real accounts arrive. */
export function SaveShare({ slug, name }: { slug: string; name: string }) {
  const { saved, toggle } = useSaved(slug, name);

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link", { description: url });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={saved}
        onClick={toggle}
        className={pillClass()}
      >
        <HeartIcon width={18} height={18} className={saved ? "fill-error text-error" : ""} />
        {saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        onClick={share}
        className={pillClass()}
      >
        <ShareIcon width={18} height={18} />
        Share
      </button>
    </div>
  );
}
