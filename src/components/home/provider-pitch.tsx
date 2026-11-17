"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MARKETING_SITE_HOME } from "@/lib/marketing-links";
import { providerPitch } from "@/lib/placeholder-data";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;
const SLIDE_DURATION_MS = 2500;

// Practitioners/studios actively at work, cycling like a carousel — real Pexels photos,
// sourced the same way as every other photo on this page. A fabricated dashboard/product
// screenshot (what Fresha's own reference shows) would imply features zen-marketplace
// doesn't have yet — it's a showcase-first layer, no real booking backend wired in
// (docs/PRODUCT_CONTEXT.md §4) — so real studio photos stand in for it instead.
const IMAGES = [
  {
    src: "https://images.pexels.com/photos/6187418/pexels-photo-6187418.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "A massage therapist performing a treatment in a calming spa studio",
  },
  {
    src: "https://images.pexels.com/photos/7446659/pexels-photo-7446659.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "An esthetician providing a rejuvenating facial treatment to a client in a modern spa clinic",
  },
  {
    src: "https://images.pexels.com/photos/8436426/pexels-photo-8436426.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "A yoga instructor guiding a student in a pose in a bright, modern studio",
  },
  {
    src: "https://images.pexels.com/photos/3993470/pexels-photo-3993470.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "A focused hair stylist cutting a client's wet hair in a modern salon",
  },
];

export function ProviderPitch() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  // Auto-advance, paused for reduced-motion users — same suppression pattern as the hero's
  // video playlist timer.
  useEffect(() => {
    if (reduceMotion || IMAGES.length < 2) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % IMAGES.length), SLIDE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [active, reduceMotion]);

  return (
    // Full-width band (not inset like every other section) so this pitch reads as its own
    // distinct block. Lighter than --muted (#ede9e0, used for the toggle pill/chip borders
    // elsewhere) on purpose — a scoped tint rather than the shared token, so lightening this
    // band doesn't wash out those other bg-muted/border-muted usages.
    <section className="w-full bg-[#f3f0e8] pb-12 pt-12">
      {/* Two-column pitch — structurally adapted from Fresha's "Fresha for business" block
          (headline + subcopy + CTA + trust stat beside a product image), own copy/photo per
          the reference principle. This section talks to providers deciding whether to list,
          not customers booking — deliberately a different audience than the rest of the
          homepage, per this round's discussion. */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.3, ease: EASE_STANDARD }}
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {providerPitch.eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold leading-[1.1] text-foreground sm:text-5xl">
            {providerPitch.headline}
          </h2>
          <p className="mt-4 max-w-md text-base leading-[1.6] text-muted-foreground">
            {providerPitch.subcopy}
          </p>

          <a
            href={MARKETING_SITE_HOME}
            className="mt-7 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {providerPitch.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <div className="mt-8 flex items-center gap-2">
            <span aria-hidden className="flex gap-0.5 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3l2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.3 9.2l6.1-.6L12 3Z" />
                </svg>
              ))}
            </span>
            <p className="text-sm font-medium text-foreground">{providerPitch.statLabel}</p>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[var(--radius-lg)]">
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={active}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_STANDARD }}
                className="absolute inset-0"
              >
                <Image
                  src={IMAGES[active].src}
                  alt={IMAGES[active].alt}
                  fill
                  priority={active === 0}
                  sizes="(max-width: 1024px) 100vw, 600px"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {IMAGES.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2">
                {IMAGES.map((img, i) => (
                  <button
                    key={img.src}
                    type="button"
                    aria-label={`Show photo ${i + 1}`}
                    aria-pressed={i === active}
                    onClick={() => setActive(i)}
                    className={`h-1.5 rounded-[var(--radius-full)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      i === active ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating preview card — structural stand-in for Fresha's phone-mockup listing
              preview, built from our own tokens rather than a fake device frame. Content
              matches the Studio Lumen entry used elsewhere (hero, BestRated) for a coherent
              placeholder universe. */}
          <div className="absolute -bottom-6 left-6 w-56 rounded-[var(--radius-lg)] bg-card p-4 shadow-[var(--shadow-floating)] sm:left-8">
            <p className="text-sm font-semibold text-card-foreground">{providerPitch.previewName}</p>
            <p className="text-xs text-muted-foreground">{providerPitch.previewLocation}</p>
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-foreground">
              <span aria-hidden className="text-accent">★</span>
              {providerPitch.previewRating.toFixed(1)}
              <span className="text-muted-foreground">· Open now</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
