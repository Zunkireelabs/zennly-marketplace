"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Destination, SearchIndex } from "@/lib/home-rails";
import { ANY_TIME, DateTimePanel, formatDay } from "@/components/home/date-time-panel";
import { TreatmentPanel, useSearchResults, type SearchItem, type SearchTab } from "@/components/home/treatment-search";
import { track } from "@/lib/analytics/track";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

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
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const query = where.trim().toLowerCase();
  const matches = destinations.filter((d) => `${d.city} ${d.region}`.toLowerCase().includes(query));

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

  return (
        <motion.form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          initial={reduceMotion || nav ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_STANDARD, delay: reduceMotion ? 0 : 0.08 }}
          className={nav ? "mx-6 hidden min-w-0 max-w-3xl flex-1 items-center gap-0 rounded-[var(--radius-lg)] bg-card p-1 shadow-[var(--shadow-floating)] ring-1 ring-border md:flex" : `relative mx-auto -mt-14 w-full max-w-3xl bg-card transition-shadow duration-200 sm:-mt-16 sm:rounded-[var(--radius-lg)] sm:p-2 ${expanded ? "rounded-[var(--radius-lg)] p-3" : "rounded-[var(--radius-full)] p-1.5"} ${stuck ? "shadow-[0_1px_2px_rgba(35,33,29,0.10),0_4px_8px_rgba(35,33,29,0.12),0_8px_16px_-4px_rgba(35,33,29,0.14),0_0_0_1px_rgba(35,33,29,0.07)]" : "shadow-[var(--shadow-floating)]"}`}
        >
          {/* The collapsed pill. `sm:hidden` rather than conditional rendering, so the three
              fields below stay mounted at every width — unmounting them would drop whatever the
              visitor had typed each time the bar collapsed. */}
          {!nav && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="hero-search-fields"
              onClick={() => {
                setExpanded(true);
                // Focus after paint: the input is display:none until `expanded` renders.
                requestAnimationFrame(() => whereRef.current?.focus());
              }}
              className={`w-full items-center gap-3 px-4 py-2.5 text-left sm:hidden ${expanded ? "hidden" : "flex"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <span className={`min-w-0 flex-1 truncate text-sm ${summary ? "text-foreground" : "text-muted-foreground"}`}>
                {summary || "Search treatments or studios"}
              </span>
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
  );
}
