"use client";

import { motion, useReducedMotion } from "framer-motion";
import { valueProps } from "@/lib/placeholder-data";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

export function ValueProps() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 gap-10 rounded-[var(--radius-lg)] bg-muted px-8 py-12 text-center sm:grid-cols-3 sm:gap-8 sm:py-16"
        transition={{ duration: 0.3, ease: EASE_STANDARD }}
      >
        {valueProps.map((prop) => (
          <div key={prop.word} className="flex flex-col items-center gap-3">
            {/* Two-tier serif display — big word + small tracked subword — adapted from Le
                Collectionist's "UNIQUE / HOMES" value-prop treatment, own copy/font (Fraunces,
                already used for the hero and collection labels rather than their typeface). */}
            <div>
              <p className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                {prop.word}
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
                {prop.subword}
              </p>
            </div>
            {/* Narrow enough that every description wraps to two lines, not just the longest
                one — matches the reference's evenly-balanced multi-line descriptions. */}
            <p className="max-w-[15rem] text-balance text-sm leading-[1.6] text-muted-foreground">
              {prop.description}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
