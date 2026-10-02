"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";
import { useProviderUi } from "./provider-shell";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

export function GalleryLightbox() {
  const { provider, galleryOpen, galleryIndex, closeGallery, setGalleryIndex } = useProviderUi();
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = provider.gallery.length;

  useEffect(() => {
    if (!galleryOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowRight") setGalleryIndex((galleryIndex + 1) % count);
      if (event.key === "ArrowLeft") setGalleryIndex((galleryIndex - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [galleryOpen, galleryIndex, count, closeGallery, setGalleryIndex]);

  return (
    <AnimatePresence>
      {galleryOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${provider.name} photos`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_STANDARD }}
          className="fixed inset-0 z-50 flex flex-col bg-foreground/95 text-white"
        >
          <div className="flex items-center justify-between px-6 py-4">
            <p className="font-[family-name:var(--font-inter)] text-sm tabular-nums">
              {galleryIndex + 1} / {count}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={closeGallery}
              aria-label="Close photos"
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] border border-white/30 transition-colors duration-150 hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-6xl flex-1 px-6">
            <div className="relative h-full min-h-[40vh]">
              <Image
                key={provider.gallery[galleryIndex]}
                src={provider.gallery[galleryIndex]}
                alt={`${provider.name}, photo ${galleryIndex + 1}`}
                fill
                sizes="(max-width: 1280px) 100vw, 1152px"
                className="rounded-[var(--radius-lg)] object-contain"
                priority
              />
            </div>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setGalleryIndex((galleryIndex - 1 + count) % count)}
                  aria-label="Previous photo"
                  className="absolute left-8 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-full)] bg-background/90 text-foreground transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryIndex((galleryIndex + 1) % count)}
                  aria-label="Next photo"
                  className="absolute right-8 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-full)] bg-background/90 text-foreground transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}
          </div>

          <div className="flex justify-center gap-2 overflow-x-auto px-6 py-4">
            {provider.gallery.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setGalleryIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === galleryIndex}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  i === galleryIndex ? "opacity-100 ring-2 ring-white" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
