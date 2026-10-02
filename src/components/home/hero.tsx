"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Destination, SearchIndex } from "@/lib/home-rails";
import { SearchBar } from "@/components/search/search-bar";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

// Self-hosted, pre-edited loop (public/videos/hero-loop.mp4) — six 2s Pexels clips
// (massage/spa, recovery/hydrotherapy, movement/yoga, beauty/lashes, beauty/makeup, a
// texture/transition beat), each trimmed and downscaled to 1280px wide with ffmpeg, then
// concatenated into one ~1.6MB file that just loops natively. Replaces swapping <video src>
// across 6 separate multi-megabyte UHD/HD Pexels URLs every 2s, which was re-fetching a
// large remote file every couple of seconds for as long as the hero was mounted.
const HERO_VIDEO_SRC = "/videos/hero-loop.mp4";
const HERO_POSTER_SRC = "/images/hero-poster.jpg";

// True on a metered/slow connection (Save-Data on, or 2g/slow-2g) — these visitors get the
// static poster instead of the video, same as reduced-motion.
function usesLightweightMedia(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}


export function Hero({ destinations, searchIndex }: { destinations: Destination[]; searchIndex: SearchIndex }) {
  const reduceMotion = useReducedMotion();
  const [lightweight, setLightweight] = useState(false);
  const [inView, setInView] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const useStaticPoster = reduceMotion || lightweight;


  // Also listens for a mid-session connection change (e.g. Save-Data toggled), not just the
  // initial value — hence a subscription rather than a one-shot setState-in-effect.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    const update = () => setLightweight(usesLightweightMedia());
    update();
    conn?.addEventListener?.("change", update);
    return () => conn?.removeEventListener?.("change", update);
  }, []);

  // Pause the video once it scrolls out of view — no point decoding it for the rest of the
  // session if nobody's looking at it.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || useStaticPoster) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [useStaticPoster]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) video.play().catch(() => {});
    else video.pause();
  }, [inView]);

  return (
    // Fragment, not a single wrapping section — the sticky search bar below needs a
    // containing block taller than just the hero, otherwise `position: sticky` only holds
    // for as long as the hero section itself is in view (see the comment above the search
    // bar). Rendered as siblings, both become direct children of <main> in page.tsx, so the
    // search bar's containing block is the whole page.
    <>
      <section ref={sectionRef} className="relative">
        <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_STANDARD }}
        // Height pixel-measured off Le Collectionist's live hero screenshot at 1920px width —
        // sampled the exact row the photo/video band ends and the white page begins: 458px.
        // Fixed breakpoint heights (not aspect-ratio — see prior lesson on onefinestay), topping
        // out at that measured 458px on desktop.
        className="relative h-[360px] w-full overflow-hidden sm:h-[420px] lg:h-[458px]"
      >
        {useStaticPoster ? (
          // Reduced-motion and data-saver/slow-connection users get the loop's first frame as
          // a static image, never the moving video — nothing beyond this one small still is
          // fetched.
          <Image
            src={HERO_POSTER_SRC}
            alt="A calm spa treatment moment"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            poster={HERO_POSTER_SRC}
            autoPlay={inView}
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
        )}

        {/* Top scrim keeps the transparent nav legible over the photo; bottom scrim
            protects the headline. Middle stays clear so the footage actually reads. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/0 to-black/45" />

        {/* Vintage treatment: a static film-grain texture (SVG feTurbulence, blended so it
            reads as texture, not noise) plus a vignette tinted with our own accent token
            (--accent, the dusty blue) rather than a plain dark corner — ties the vintage
            treatment back to our palette instead of an arbitrary hardcoded brown. Static,
            so nothing here needs a prefers-reduced-motion guard. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Flat accent wash — a direct, unmistakable blue tint (not just a blended vignette). */}
        <div className="pointer-events-none absolute inset-0 bg-accent/12 mix-blend-multiply" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at center, transparent 30%, color-mix(in srgb, var(--accent) 60%, transparent) 100%)",
          }}
        />

        {/* Two-tier headline (small overline + large bold display word) + short fragmented
            subtitle — structural pattern borrowed from Le Collectionist's hero, own copy.
            Same center alignment as before. */}
        <div className="absolute inset-x-0 bottom-16 flex flex-col items-center gap-3 px-6 text-center text-white sm:bottom-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            Time for
          </p>
          <h1 className="font-serif text-5xl font-bold uppercase leading-[1.05] tracking-wide sm:text-7xl">
            Stillness
          </h1>
          <p className="text-sm text-white/85 sm:text-base">
            Curated providers. Real reviews. Book in seconds.
          </p>
        </div>
      </motion.div>
      </section>

      {/* Receded search bar — floats over the hero edge, deliberately quiet
          (docs/PRODUCT_CONTEXT.md §7.2). sticky top-0 — nav is static now (no longer fixed), so
          once the nav scrolls past, this docks flush to the very top of the viewport instead of
          scrolling away — the "search bar sticks to the top" pattern from lecollectionist.com.
          Sibling of the hero <section> (see the Fragment comment above), not nested inside it,
          so it keeps sticking for the rest of the page instead of un-sticking once the short
          hero section ends. */}
      <div className="sticky top-3 z-20 mx-auto max-w-7xl px-6">
        <SearchBar destinations={destinations} searchIndex={searchIndex} />
      </div>
    </>
  );
}
