"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Destination, SearchIndex } from "@/lib/home-rails";
import { ANY_TIME, DateTimePanel, formatDay } from "@/components/home/date-time-panel";
import { TreatmentPanel, useSearchResults, type SearchItem, type SearchTab } from "@/components/home/treatment-search";
import { track } from "@/lib/analytics/track";
import { typingFrame } from "@/lib/search/pill-typing";
import { nextSheet, type Sheet, type SheetAction } from "@/lib/search/sheet-nav";
import { MobileSearchSheet } from "@/components/search/mobile-search";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

const PILL_TICK_MS = 90;

// Cities for the collapsed mobile pill's typing animation. None of these resolve to real
// provider data today (providers are US cities plus Kathmandu) — the owner has chosen to ship
// the placeholder this way anyway; this is not the search index's city list and must not become
// one.
const PILL_CITIES = [
  "Lazimpat",
  "Thamel",
  "Durbarmarg",
  "Sanepa",
  "Bouddha",
  "Pokhara",
  "Bhaisepati",
  "Jhamsikhel",
] as const;

// Pin positions (% of the map image) for each studio city, projected with the same Albers USA
// projection used to draw public/images/map-us.svg.
const MAP_POINTS: Record<string, [number, number]> = {Portland:[10.76,16.95],Austin:[47.74,79.6],Seattle:[12.52,10.19],Denver:[36.09,45.21],Boulder:[35.69,44.19],Bend:[11.94,22.78],Brooklyn:[86.87,36.45],"Santa Fe":[33.59,59.15],"San Diego":[12.72,64.21]};

/**
 * The one site search bar (Where / What / When). Used on the homepage hero and in the nav of every
 * inner page, so a change here shows up everywhere.
 * - `hero`: the larger card that floats over the hero's lower edge.
 * - `nav`: the compact single row that sits inside the nav; dropdown panels anchor to the nav.
 */
export function SearchBar({
  destinations,
  searchIndex,
  variant = "hero",
}: {
  destinations: Destination[];
  searchIndex: SearchIndex;
  variant?: "hero" | "nav";
}) {
  const nav = variant === "nav";
  const router = useRouter();
  // Mobile only: the hero bar starts as a single pill and expands into the three-field card on
  // tap. Three stacked fields plus a Search button is ~210px of a ~700px viewport, and because
  // the bar is `sticky top-3` it carries that height down the whole page — on a phone it covered
  // the first studio card permanently. Desktop has the width to show all three at once and keeps
  // the open card; this state is simply ignored above `sm`, where the fields are `sm:flex`.
  const [expanded, setExpanded] = useState(false);
  const whereRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  // Hero only: once the bar docks to the top of the viewport (sticky top-3), lift it with a deeper shadow.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (nav) return;
    const onScroll = () => setStuck((formRef.current?.getBoundingClientRect().top ?? 999) <= 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [nav]);
  const [pillTick, setPillTick] = useState(0);
  // Mobile full-screen search (location picker, then the stacked form). `sheet` is the only new
  // piece of state this adds — the overlay itself is presentational and reads/writes the same
  // where/what/date/time/active state as everything else in this component.
  const [sheet, setSheet] = useState<Sheet>(null);
  const sheetRef = useRef<Sheet>(null);
  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);
  const pillRef = useRef<HTMLButtonElement>(null);
  const sheetWasOpenRef = useRef(false);
  // True for the span of our own synthetic `history.back()` calls below, so the popstate they
  // cause isn't mistaken for a real hardware-back press.
  const popSuppressRef = useRef(false);
  const pendingAfterCloseRef = useRef<(() => void) | null>(null);
  // The location sheet's own search text — separate from `where`, so a past selection doesn't
  // pre-fill the box, and separate from `what`, so opening the sheet never shows someone else's
  // in-progress treatment search. Cleared at every point below that closes the sheet, so it's
  // always empty the next time it opens.
  const [sheetQuery, setSheetQuery] = useState("");

  // Every tap-driven transition goes through here so history stays in lockstep with `sheet`:
  // opening pushes one entry, and any transition that lands on `null` (closing) pops it straight
  // back out — "closing by chevron must consume its own entry so the user isn't left pressing
  // back twice." Stepping between `location` and `form` touches no history at all; both live
  // under the one entry pushed when the sheet first opened.
  const dispatchSheet = (action: SheetAction, after?: () => void) => {
    const next = nextSheet(sheet, action);
    if (sheet === null && next !== null) {
      window.history.pushState({ zennlySheetOpen: true }, "");
    } else if (sheet !== null && next === null) {
      popSuppressRef.current = true;
      if (after) pendingAfterCloseRef.current = after;
      window.history.back();
    } else if (after) {
      after();
    }
    if (next === null) setSheetQuery("");
    setSheet(next);
  };
  // Escape is a direct close from either screen — not modeled in nextSheet's table, which only
  // encodes the chevron/back step-or-close behaviour.
  const closeSheet = () => {
    if (sheet === null) return;
    popSuppressRef.current = true;
    window.history.back();
    setSheetQuery("");
    setSheet(null);
  };

  // Android hardware back: step a screen rather than leave the page. A press here always
  // consumes one real history entry; if the resulting screen is still open, push a fresh one
  // immediately so the NEXT back press has something to consume too, instead of leaving the page.
  useEffect(() => {
    const onPopState = () => {
      if (popSuppressRef.current) {
        popSuppressRef.current = false;
        const after = pendingAfterCloseRef.current;
        pendingAfterCloseRef.current = null;
        // Deferred out of this tick: Next's own router also reconciles on popstate, and a
        // navigation triggered synchronously inside the SAME dispatch — as `go()`'s router.push
        // does — silently loses the race and never commits. Confirmed by direct A/B: the exact
        // same router.push works immediately outside a popstate handler, and fails consistently
        // (reproducibly, on an already-compiled route) when called synchronously inside one.
        if (after) setTimeout(after, 0);
        return;
      }
      const next = nextSheet(sheetRef.current, "back");
      if (next !== null) window.history.pushState({ zennlySheetOpen: true }, "");
      else setSheetQuery("");
      setSheet(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Escape closes the sheet outright, from either screen.
  useEffect(() => {
    if (sheet === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  // Lock body scroll while the sheet is open and restore the exact position on close — keyed on
  // open/closed rather than on `sheet` itself, so stepping between the two screens doesn't
  // re-measure (and clobber) the saved scroll position.
  const sheetOpen = sheet !== null;
  useEffect(() => {
    if (!sheetOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [sheetOpen]);

  // Focus returns to the pill once the sheet fully closes — not on first mount, which is why this
  // tracks "was it open a moment ago" rather than just reacting to `sheet === null`.
  useEffect(() => {
    if (sheet !== null) {
      sheetWasOpenRef.current = true;
      return;
    }
    if (sheetWasOpenRef.current) {
      sheetWasOpenRef.current = false;
      pillRef.current?.focus();
    }
  }, [sheet]);

  const [where, setWhere] = useState("");
  // Which search field is open: its panel shows and the field expands.
  const [active, setActive] = useState<"where" | "what" | "when" | null>(null);
  const panelOpen = active === "where";
  const setPanelOpen = (open: boolean) => setActive(open ? "where" : null);
  const [what, setWhat] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const keyboardMoved = useRef(false);
  const scopedCity = destinations.find((d) => `${d.city}, ${d.region}` === where)?.city ?? null;
  const results = useSearchResults(searchIndex, what, tab, scopedCity);
  const effectiveKey =
    results.flat.find((i) => i.key === activeKey)?.key ?? (what.trim() ? results.flat[0]?.key ?? null : null);
  // A second, independent call for the location sheet's combined search — unscoped (no city),
  // since the visitor hasn't picked one yet there, and driven by `sheetQuery` rather than `what`.
  const sheetResults = useSearchResults(searchIndex, sheetQuery, "all", null);

  // Keep the arrow-key selection in view inside the scrolling list.
  useEffect(() => {
    if (!keyboardMoved.current || !effectiveKey) return;
    keyboardMoved.current = false;
    formRef.current?.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      if (el.dataset.key === effectiveKey) el.scrollIntoView({ block: "nearest" });
    });
  }, [effectiveKey]);

  const go = (view?: "map") => {
    // Only whether something was typed is tracked, never the text itself.
    track("search_run", { has_query: Boolean(where.trim() || what.trim()) });
    const q = new URLSearchParams();
    if (where.trim()) q.set("where", where.trim());
    if (what.trim()) q.set("what", what.trim());
    if (date) q.set("date", date);
    if (time) q.set("time", time);
    if (view) q.set("view", view);
    setActive(null);
    setExpanded(false);
    router.push(`/search${q.size ? `?${q}` : ""}`);
  };

  const pick = (item: SearchItem) => {
    if (item.href) {
      setActive(null);
      router.push(item.href);
      return;
    }
    setWhat(item.fill ?? item.label);
    setActive(null);
  };

  // Shared by the location sheet's rows and "Near me" — sets the exact string the desktop panel
  // already sets, so `scopedCity` keeps resolving either way.
  const pickDestination = (d: Destination) => {
    setWhere(`${d.city}, ${d.region}`);
    dispatchSheet("pickCity");
  };

  // The location sheet's combined search: a studio navigates away entirely, so close the sheet
  // first and defer the navigation until that close's own history entry is actually consumed —
  // same reasoning as the Search button, so this doesn't dangle a second entry the way an
  // immediate router.push alongside an un-popped entry would.
  const pickSearchItem = (item: SearchItem) => {
    if (item.href) {
      dispatchSheet("pickStudio", () => pick(item));
      return;
    }
    pick(item);
    dispatchSheet("pickService");
  };

  const onWhatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = results.flat;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!list.length) return;
      e.preventDefault();
      const at = list.findIndex((i) => i.key === effectiveKey);
      const next = e.key === "ArrowDown" ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
      keyboardMoved.current = true;
      setActiveKey(list[next].key);
    } else if (e.key === "Enter") {
      const item = list.find((i) => i.key === effectiveKey);
      if (item) {
        e.preventDefault();
        pick(item);
      }
    }
  };
  // Mobile form screen's What input: Enter-to-pick only. Arrow-key highlighting is meaningless
  // on a touchscreen with no physical arrow keys, and there's no visual "highlighted" row state
  // on this screen for them to move between — reusing the desktop handler's arrow branches would
  // just be dead code here. Enter still picks the top result (effectiveKey already falls back to
  // results.flat[0] once something's typed), which is the one affordance worth keeping.
  const onWhatEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const item = results.flat.find((i) => i.key === effectiveKey);
    if (item) {
      e.preventDefault();
      pick(item);
    }
  };
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const query = where.trim().toLowerCase();
  const matches = destinations.filter((d) => `${d.city} ${d.region}`.toLowerCase().includes(query));
  // Same filter, applied to the sheet's own query instead of `where` — the desktop dropdown and
  // the mobile sheet search different text, so they get independent results.
  const sheetQueryNorm = sheetQuery.trim().toLowerCase();
  const sheetMatches = destinations.filter((d) => `${d.city} ${d.region}`.toLowerCase().includes(sheetQueryNorm));

  // Close the destinations panel on outside click or Escape — and on mobile collapse the bar
  // back to its pill, since a tap outside is the only dismissal gesture it offers (there is no
  // visible close control, and leaving it open would re-cover the page it was expanded over).
  useEffect(() => {
    if (!active && !expanded) return;
    const dismiss = () => {
      setPanelOpen(false);
      setExpanded(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!formRef.current?.contains(e.target as Node)) dismiss();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, expanded]);

  // What the collapsed pill says. Echoing the current selection rather than a fixed placeholder
  // is the point of collapsing: the bar still has to answer "what did I search for?" once it
  // stops showing its own fields.
  const summary = [where.trim(), what.trim(), date ? `${formatDay(date)}${time ? ` · ${time}` : ""}` : ""]
    .filter(Boolean)
    .join(" · ");

  // The collapsed pill's typing animation only has anything to animate once there's no real
  // selection to echo, and only one timer runs regardless of how many times this effect re-fires
  // (each run clears the previous interval first). Skipped entirely for `nav`, which never
  // renders the pill at all.
  const animatePill = !nav && !reduceMotion && !summary;
  useEffect(() => {
    if (!animatePill) return;
    const id = window.setInterval(() => setPillTick((t) => t + 1), PILL_TICK_MS);
    return () => window.clearInterval(id);
  }, [animatePill]);
  const pillFrame = animatePill ? typingFrame(pillTick, PILL_CITIES) : null;

  // The hero's bottom edge should pass through the bar's vertical centre — half on the image,
  // half on the page below. That means -mt must equal HALF the bar's own rendered height at each
  // breakpoint, measured in the browser, not guessed:
  //   mobile (<sm): the collapsed pill is 64px tall (py-4 pill + its 1.5-unit wrapper padding) → -mt-8 (32px).
  //   sm and up: the three-field row is ~68.5px tall → -mt-[34px].
  // If either bar's height changes again (padding, font size, the pill's own py-*), these values
  // must be re-measured and updated together, or the centering silently drifts off.
  return (
    <>
        <motion.form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          initial={reduceMotion || nav ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_STANDARD, delay: reduceMotion ? 0 : 0.08 }}
          className={nav ? "mx-6 hidden min-w-0 max-w-3xl flex-1 items-center gap-0 rounded-[var(--radius-lg)] bg-card p-1 shadow-[var(--shadow-floating)] ring-1 ring-border md:flex" : `relative mx-auto -mt-8 w-full max-w-3xl bg-card transition-shadow duration-200 sm:-mt-[34px] sm:rounded-[var(--radius-lg)] sm:p-2 ${expanded ? "rounded-[var(--radius-lg)] p-3" : "rounded-[var(--radius-full)] p-1.5"} ${stuck ? "shadow-[0_1px_2px_rgba(35,33,29,0.10),0_4px_8px_rgba(35,33,29,0.12),0_8px_16px_-4px_rgba(35,33,29,0.14),0_0_0_1px_rgba(35,33,29,0.07)]" : "shadow-[var(--shadow-floating)]"}`}
        >
          {/* The collapsed pill. `sm:hidden` rather than conditional rendering, so the three
              fields below stay mounted at every width — unmounting them would drop whatever the
              visitor had typed each time the bar collapsed. */}
          {!nav && (
            <button
              ref={pillRef}
              type="button"
              aria-expanded={sheet !== null}
              aria-controls="mobile-search-sheet"
              // Stable name regardless of the typing animation underneath — a button whose
              // accessible name changed on every character would be unusable with a screen
              // reader. Only set when there's no real summary to announce; the summary case keeps
              // its existing (already stable) name, read straight from the visible text.
              aria-label={summary ? undefined : "Search treatments or studios"}
              onClick={() => dispatchSheet("openPill")}
              className={`w-full items-center gap-3 px-4 py-4 text-left sm:hidden ${sheet ? "hidden" : "flex"}`}
            >
              {summary ? (
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{summary}</span>
              ) : (
                // aria-hidden: the button's aria-label above already gives screen readers a
                // stable name, so this animated sentence isn't re-announced on every character.
                <span aria-hidden className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {/* Short on purpose. "Search for a service provider in " alone filled the pill
                      at 320px, so the city — the whole point of the animation — was truncated away
                      before its first character on the narrowest phones. Keep any replacement
                      wording about this length, and check 320px before changing it. */}
                  Search for studios in{" "}
                  <span className="font-semibold text-foreground">
                    {reduceMotion ? PILL_CITIES[0] : pillFrame?.text}
                  </span>
                  {/* The typing caret: pure CSS blink, no extra timer or state — typingFrame()
                      stays a plain string function. Suppressed under reduced motion, where the
                      pill shows one static city and a blinking caret would defeat the point. */}
                  {!reduceMotion && (
                    <span className="pill-caret ml-0.5 inline-block h-[1em] w-px translate-y-[0.1em] bg-foreground align-middle" />
                  )}
                </span>
              )}
              {/* Trailing, matching the reference — the icon stays decorative and in the same
                  spot whether the pill shows the real summary or the typing animation. */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
          )}

          <div
            id="hero-search-fields"
            className={`w-full min-w-0 flex-1 flex-col gap-2 sm:flex sm:flex-row sm:items-center sm:gap-0 ${nav || expanded ? "flex" : "hidden"}`}
          >
          <div className={`flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] px-3 py-1.5 transition-[flex-grow,background-color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:basis-0 ${panelOpen ? "bg-muted sm:grow-[2.6]" : active ? "opacity-60 sm:grow-[0.7]" : "sm:grow"}`}>
            <label htmlFor="hero-search-location" className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              Where
            </label>
            <input
              id="hero-search-location"
              ref={whereRef}
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={panelOpen}
              aria-controls="hero-destinations"
              value={where}
              onChange={(e) => {
                setWhere(e.target.value);
                setPanelOpen(true);
              }}
              onFocus={() => setPanelOpen(true)}
              placeholder="City or area"
              className="w-full min-w-0 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="mx-1.5 hidden h-9 w-px bg-border sm:block" />

          <div className={`flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] px-3 py-1.5 transition-[flex-grow,background-color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:basis-0 ${active === "what" ? "bg-muted sm:grow-[2.6]" : active ? "opacity-60 sm:grow-[0.7]" : "sm:grow"}`}>
            <label htmlFor="hero-search-treatment" className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
              What
            </label>
            <input
              id="hero-search-treatment"
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={active === "what"}
              aria-controls="hero-what-results"
              value={what}
              onChange={(e) => {
                setWhat(e.target.value);
                setActive("what");
              }}
              onFocus={() => setActive("what")}
              onKeyDown={onWhatKeyDown}
              placeholder="Treatment, studio…"
              className="w-full min-w-0 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="mx-1.5 hidden h-9 w-px bg-border sm:block" />

          <div className={`flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] px-3 py-1.5 transition-[flex-grow,background-color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:basis-0 ${active === "when" ? "bg-muted sm:grow-[2.6]" : active ? "opacity-60 sm:grow-[0.7]" : "sm:grow"}`}>
            <label htmlFor="hero-search-date" className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></svg>
              When
            </label>
            <button
              id="hero-search-date"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={active === "when"}
              onClick={() => setActive(active === "when" ? null : "when")}
              className={`w-full min-w-0 truncate text-left text-sm focus:outline-none ${date ? "text-foreground" : "text-muted-foreground"}`}
            >
              {date ? `${formatDay(date)}${time ? ` · ${time}` : ""}` : "Add date & time"}
            </button>
          </div>

          <button
            type="submit"
            className="mt-1 rounded-[var(--radius-md)] bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-hover sm:mt-0 sm:ml-2"
          >
            Search
          </button>
          </div>

          {active === "when" && (
            <div className="absolute left-1/2 top-full z-30 mt-2 w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] bg-card shadow-[var(--shadow-floating)]">
              <DateTimePanel
                date={date}
                time={time}
                onDate={(d) => {
                  setDate(d);
                  if (!time) setTime(ANY_TIME);
                }}
                onTime={setTime}
                onClear={() => {
                  setDate("");
                  setTime("");
                }}
                onDone={() => setActive(null)}
              />
            </div>
          )}
          {active === "what" && (
            <div className="absolute left-1/2 top-full z-30 mt-2 w-[min(72rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] bg-card shadow-[var(--shadow-floating)]">
              <TreatmentPanel
                results={results}
                query={what}
                tab={tab}
                onTab={setTab}
                activeKey={effectiveKey}
                onActive={setActiveKey}
                onPick={pick}
                cityLabel={scopedCity ? where : null}
                onClearCity={() => setWhere("")}
              />
            </div>
          )}
          {panelOpen && (
            <div
              id="hero-destinations"
              className="absolute left-1/2 top-full z-30 mt-2 w-[min(72rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] bg-card shadow-[var(--shadow-floating)]"
            >
              {/* Scrolls, but with the scrollbar hidden so the rounded right edge stays clean. */}
              <div className="max-h-[82vh] overflow-y-auto overscroll-contain p-5 [scrollbar-width:none] sm:max-h-none sm:overflow-visible sm:p-7 [&::-webkit-scrollbar]:hidden">
              {matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No studios in &ldquo;{where}&rdquo; yet.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-[minmax(0,15rem)_1px_minmax(0,1fr)] sm:gap-7">
                  <div>
                    <p className="mb-3 text-xs font-medium text-foreground">Popular areas</p>
                    <ul className="flex flex-col">
                      {matches.slice(0, 6).map((d) => (
                        <li key={d.city}>
                          <button
                            type="button"
                            onClick={() => {
                              setWhere(`${d.city}, ${d.region}`);
                              setPanelOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-1 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="shrink-0 text-muted-foreground">
                              <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            {d.city}, {d.region}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="hidden bg-border sm:block" />
                  {/* From tablet up only this column scrolls; Popular areas stays put. */}
                  <div className="overscroll-contain sm:max-h-[calc(82vh-3.5rem)] sm:overflow-y-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
                    <p className="mb-3 text-xs font-medium text-foreground">Studios by city</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                      {matches.map((d) => (
                        <li key={d.city}>
                          <button
                            type="button"
                            onClick={() => {
                              setWhere(`${d.city}, ${d.region}`);
                              setPanelOpen(false);
                            }}
                            className="group block w-full text-left"
                          >
                            <span className="relative block aspect-[2/1] overflow-hidden rounded-[var(--radius-sm)] bg-muted">
                              <Image src={d.image} alt="" fill sizes="200px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                            </span>
                            <span className="mt-2 block text-sm text-foreground">{d.city}</span>
                            <span className="block text-xs text-muted-foreground">
                              {d.count} {d.count === 1 ? "studio" : "studios"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="relative mt-4 h-44 w-full overflow-hidden rounded-[var(--radius-sm)] bg-[#dfe6df]">
                      <div className="absolute left-1/2 h-[125%] -translate-x-1/2 aspect-[960/600]" style={{ top: "-7.5%" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/map-us.svg" alt="" className="absolute inset-0 h-full w-full" loading="lazy" />
                      </div>
                      <button
                        type="button"
                        onClick={() => go("map")}
                        className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background shadow-[var(--shadow-floating)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        View on map
                      </button>
                      <div className="absolute left-1/2 h-[125%] -translate-x-1/2 aspect-[960/600]" style={{ top: "-7.5%" }}>
                      {matches.map((d) => {
                        const at = MAP_POINTS[d.city];
                        if (!at) return null;
                        return (
                          <button
                            key={d.city}
                            type="button"
                            aria-label={`${d.city}, ${d.region}`}
                            onClick={() => {
                              setWhere(`${d.city}, ${d.region}`);
                              setPanelOpen(false);
                            }}
                            style={{ left: `${at[0]}%`, top: `${at[1]}%` }}
                            className="group/pin absolute -translate-x-1/2 -translate-y-1/2"
                          >
                            <span className="block size-2.5 rounded-full border-[1.5px] border-white bg-primary shadow transition-transform duration-150 group-hover/pin:scale-150" />
                            <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background opacity-0 transition-opacity group-hover/pin:opacity-100">
                              {d.city}
                            </span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </motion.form>
      {sheet && (
        <MobileSearchSheet
          screen={sheet}
          destinations={destinations}
          sheetQuery={sheetQuery}
          sheetMatches={sheetMatches}
          sheetResults={sheetResults}
          where={where}
          what={what}
          date={date}
          time={time}
          active={active}
          results={results}
          tab={tab}
          effectiveKey={effectiveKey}
          onSheetQueryChange={setSheetQuery}
          onPickDestination={pickDestination}
          onPickSearchItem={pickSearchItem}
          onChevron={() => dispatchSheet("chevron")}
          onTapWhere={() => dispatchSheet("tapWhere")}
          onSetActive={setActive}
          onActiveKey={setActiveKey}
          onWhatChange={setWhat}
          onWhatEnter={onWhatEnter}
          onPick={pick}
          onClearCity={() => setWhere("")}
          onClearWhere={() => setWhere("")}
          onClearWhat={() => setWhat("")}
          onTab={setTab}
          onDate={setDate}
          onTime={setTime}
          onClearDateTime={() => {
            setDate("");
            setTime("");
          }}
          onClearAll={() => {
            setWhere("");
            setWhat("");
            setDate("");
            setTime("");
            setSheetQuery("");
          }}
          onSearch={() => dispatchSheet("search", go)}
        />
      )}
    </>
  );
}
