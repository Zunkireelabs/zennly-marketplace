import Image from "next/image";
import type { Provider } from "@/lib/providers";

/**
 * The studio's photo band under the header on every booking step: logo circle and name sit INSIDE
 * the band, in white over a dark scrim. Self-contained (relative + overflow-hidden), so nothing in
 * it can paint over the page content below.
 */
export function BookHero({ provider }: { provider: Provider }) {
  return (
    <div className="relative isolate h-28 w-full overflow-hidden sm:h-[170px]">
      <Image src={provider.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <span className="pointer-events-none absolute inset-0 bg-foreground/55" />
      <div className="absolute inset-x-0 bottom-0 top-0 flex items-center">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-full)] border-2 border-white/80 bg-card text-xl font-semibold text-card-foreground sm:h-[72px] sm:w-[72px] sm:text-2xl"
          >
            {provider.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 text-white">
            <h1 className="truncate text-xl font-semibold sm:text-3xl">{provider.name}</h1>
            <p className="truncate text-sm text-white/85">
              {provider.modality} · {provider.location}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
