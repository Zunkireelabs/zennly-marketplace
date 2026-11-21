"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { promoBanners } from "@/lib/placeholder-data";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;
const AUTO_ADVANCE_MS = 5000;
const SWIPE_THRESHOLD = 60;

export function PromoBanners() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const banner = promoBanners[index];

  const goTo = (next: number) => {
    setIndex(((next % promoBanners.length) + promoBanners.length) % promoBanners.length);
  };

  // Auto-advance, paused for reduced-motion users — same suppression pattern as the hero's
  // video playlist timer.
  useEffect(() => {
    if (reduceMotion || promoBanners.length < 2) return;
    const timer = setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, reduceMotion]);

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted">
        <AnimatePresence mode="wait" initial={false}>
          <motion.a
            key={banner.headline}
            href="#"
            drag={reduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) goTo(index + 1);
              else if (info.offset.x > SWIPE_THRESHOLD) goTo(index - 1);
            }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_STANDARD }}
            className="group flex cursor-grab flex-col gap-5 p-5 pb-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing sm:min-h-[200px] sm:flex-row sm:items-center sm:gap-8 sm:p-6 lg:px-8"
          >
            <span className="relative block h-32 w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] sm:h-40 sm:w-40 lg:w-48">
              <Image
                src={banner.image}
                alt={banner.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover"
                draggable={false}
              />
            </span>
            <span className="flex flex-1 flex-col items-start">
              <span className="inline-flex items-center rounded-[var(--radius-full)] bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-foreground">
                {banner.badge}
              </span>
              <span className="mt-3 block text-2xl font-semibold leading-tight text-foreground">
                {banner.headline}
              </span>
              {banner.subcopy && (

                <span className="mt-1 block max-w-md text-sm text-muted-foreground sm:text-base">

                  {banner.subcopy}

                </span>

              )}
            </span>
            <span className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-200 group-hover:bg-primary-hover sm:mr-12">
              {banner.ctaLabel}
            </span>
          </motion.a>
        </AnimatePresence>

        {promoBanners.length > 1 && (
          <>
            <div className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
              <button
                type="button"
                aria-label="Previous offer"
                onClick={() => goTo(index - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-full)] border border-border bg-card text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next offer"
                onClick={() => goTo(index + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-full)] border border-border bg-card text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                ›
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 sm:hidden">
              {promoBanners.map((b, i) => (
                <button
                  key={b.headline}
                  type="button"
                  aria-label={`Show offer ${i + 1}`}
                  aria-pressed={i === index}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-[var(--radius-full)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
