"use client";

import type { RefObject } from "react";
import { useReducedMotion } from "framer-motion";

/** Prev/next white circular outline buttons that scroll a horizontal rail. */
export function RailArrows({
  railRef,
  label,
}: {
  railRef: RefObject<HTMLElement | null>;
  label: string;
}) {
  const reduceMotion = useReducedMotion();

  const scrollBy = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 280, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const button =
    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-full)] border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="hidden shrink-0 gap-2 sm:flex">
      <button type="button" aria-label={`Previous ${label}`} onClick={() => scrollBy(-1)} className={button}>
        ‹
      </button>
      <button type="button" aria-label={`Next ${label}`} onClick={() => scrollBy(1)} className={button}>
        ›
      </button>
    </div>
  );
}
