"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { RailArrows } from "@/components/ui/rail-arrows";
import { socialProofStories } from "@/lib/placeholder-data";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

export function SocialProof() {
  const reduceMotion = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState<Set<number>>(new Set());

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <div className="mb-5 flex items-end justify-between">
        {/* Typography matched to the other curated-rail titles (Your Mood, Best Rated
            Providers, Choose a Collection). */}
        <h2 className="text-2xl font-normal leading-[1.4] text-foreground sm:text-[32px] sm:leading-[45px]">
          Their Self-Care Stories
        </h2>
        <RailArrows railRef={rail} label="story" />
      </div>

      <motion.div
        ref={rail}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.3, ease: EASE_STANDARD }}
        // pt-4 here (not just pb-14) so a card has room to actually scale upward on hover —
        // overflow-x-auto forces overflow-y to clip too, so without top clearance the "pop"
        // was getting cut off by the rail's own bounds instead of being visible.
        className="flex items-start gap-5 overflow-x-auto px-1 pb-14 pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {socialProofStories.map((member, i) => {
          const isPlaying = playing.has(i);

          return (
            // Flat row, equal gaps — no vertical stagger (dropped per feedback). Hover "pop" is
            // a lift only (translate-y), not a scale — scaling an element that also carries
            // border-radius + overflow-hidden was squaring off its top corners (a compositor
            // rendering quirk, not an intended radius change).
            <div
              key={member.name}
              // Lift only, no scale — scale was what triggered the corner-rendering quirk.
              className="group relative aspect-[9/16] w-64 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-3"
            >
              <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-lg)] bg-muted shadow-none transition-shadow duration-300 group-hover:shadow-[var(--shadow-modal)]">
                {isPlaying && member.video ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={member.poster || undefined}
                  >
                    <source src={member.video} type="video/mp4" />
                  </video>
                ) : (
                  <>
                    {member.poster && (
                      <Image
                        src={member.poster}
                        alt={member.videoAlt}
                        fill
                        sizes="256px"
                        className="object-cover"
                      />
                    )}
                    {!member.poster && (
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{ background: member.tone }}
                      />
                    )}
                    {member.video && (
                      <button
                        type="button"
                        aria-label={`Play ${member.name}'s story`}
                        onClick={() => setPlaying((prev) => new Set(prev).add(i))}
                        className="absolute inset-0 flex items-center justify-center focus-visible:outline-none"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-white/90 text-foreground shadow-[var(--shadow-floating)] transition-transform duration-150 hover:scale-105">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M4 2.5v11l9-5.5-9-5.5Z" />
                          </svg>
                        </span>
                      </button>
                    )}
                  </>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 pt-10">
                  <p className="line-clamp-2 text-xs leading-[1.4] text-white/90">
                    &ldquo;{member.story}&rdquo;
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-white">{member.name}</p>
                  <p className="text-xs text-white/80">{member.location}</p>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}
