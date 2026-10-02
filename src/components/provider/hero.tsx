import Image from "next/image";
import type { Provider } from "@/lib/providers";
import { HeroPhotoButton } from "./hero-actions";

/**
 * Full-bleed photo hero (structure from lecollectionist.com's property page). Desktop shows one
 * image and the booking card overlaps its lower-right edge (see the page grid); mobile swaps to
 * a swipeable strip of the gallery. The top scrim keeps the transparent white nav readable.
 */
export function ProviderHero({ provider }: { provider: Provider }) {
  return (
    <div className="relative">
      {/* Desktop */}
      <div className="relative hidden h-[62vh] min-h-[440px] max-h-[640px] w-full lg:block">
        <Image
          src={provider.image}
          alt={`${provider.name}, ${provider.modality} studio in ${provider.city}`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-foreground/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-6">
          <div className="mx-auto max-w-7xl px-6">
            <HeroPhotoButton />
          </div>
        </div>
      </div>

      {/* Mobile and tablet: swipeable strip */}
      <div className="relative lg:hidden">
        <div
          className="flex h-[52vh] min-h-[320px] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label={`${provider.name} photos, swipe to browse`}
        >
          {provider.gallery.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-center">
              <Image
                src={src}
                alt={i === 0 ? `${provider.name}, ${provider.modality} studio in ${provider.city}` : `${provider.name}, photo ${i + 1}`}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <span className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-foreground/55 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <HeroPhotoButton />
        </div>
      </div>
    </div>
  );
}
