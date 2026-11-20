"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDay } from "@/components/home/date-time-panel";
import type { SearchQuery, SearchResult } from "@/lib/search";
import { FilterBar, NO_FILTERS, type Filters } from "./filter-bar";
import { MapSkeleton } from "./map-skeleton";
import type { MapBounds } from "./studio-map";
import { pillClass } from "@/components/ui/pill";
import { Price } from "@/components/ui/price";
import { useCurrency } from "@/lib/currency/use-currency";

// MapLibre needs the browser, so the map loads client-side only, and only on this page.
const StudioMap = dynamic(() => import("./studio-map").then((m) => m.StudioMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type Sort = "rating" | "price-asc" | "price-desc";
const SORTS: { id: Sort; label: string }[] = [
  { id: "rating", label: "Top rated" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

export function SearchExperience({
  results,
  query,
  initialView,
}: {
  results: SearchResult[];
  query: SearchQuery;
  initialView: "list" | "map";
}) {
  const [view, setView] = useState(initialView);
  const [expanded, setExpanded] = useState(initialView === "map");
  const [sort, setSort] = useState<Sort>("rating");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [area, setArea] = useState<MapBounds | null>(null);
  const [latest, setLatest] = useState<MapBounds | null>(null);
  const [moved, setMoved] = useState(false);
  const { currency, toDisplay } = useCurrency();

  // Typed budget amounts mean nothing in another currency, so they only count in the currency they were typed in.
  const [typedFilters, setFilters] = useState<Filters>(NO_FILTERS);
  const [budgetCurrency, setBudgetCurrency] = useState(currency);
  const filters = useMemo(
    () => (budgetCurrency === currency ? typedFilters : { ...typedFilters, minPrice: "", maxPrice: "" }),
    [typedFilters, budgetCurrency, currency]
  );

  const modalities = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((r) => r.modalities.forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [results]);

  // What the map shows: the modality filter applied, but not the area (the area is the map's own view).
  const filtered = useMemo(() => {
    // The budget fields are typed in the display currency, so compare against converted prices.
    const min = filters.minPrice ? Number(filters.minPrice) : 0;
    const max = filters.maxPrice ? Number(filters.maxPrice) : Infinity;
    const list = results.filter(
      (r) =>
        (filters.treatments.length === 0 || filters.treatments.some((t) => r.modalities.includes(t))) &&
        toDisplay(r.fromPrice) >= min &&
        toDisplay(r.fromPrice) <= max &&
        r.rating >= filters.minRating &&
        (!filters.onlyNew || r.isNew)
    );
    return [...list].sort((a, b) =>
      sort === "price-asc" ? a.fromPrice - b.fromPrice : sort === "price-desc" ? b.fromPrice - a.fromPrice : b.rating - a.rating
    );
  }, [results, filters, sort, toDisplay]);

  const listed = useMemo(
    () =>
      area
        ? filtered.filter(
            (r) =>
              r.lat != null &&
              r.lng != null &&
              r.lat <= area.north &&
              r.lat >= area.south &&
              r.lng <= area.east &&
              r.lng >= area.west
          )
        : filtered,
    [filtered, area]
  );

  const priceBounds = useMemo(() => {
    const prices = results.map((r) => toDisplay(r.fromPrice));
    return { min: Math.min(...prices, 0) || 0, max: Math.max(...prices, 0) };
  }, [results, toDisplay]);

  const filterBar = (floating: boolean) => (
    <FilterBar
      filters={filters}
      onChange={(f) => {
        setFilters(f);
        setBudgetCurrency(currency);
        setArea(null);
      }}
      treatments={modalities}
      bounds={priceBounds}
      count={filtered.length}
      floating={floating}
    />
  );

  const fitKey = filtered.map((r) => r.slug).join(",");

  // A pin picked on the map brings its card into view in the list.
  useEffect(() => {
    if (!activeSlug) return;
    document.getElementById(`card-${activeSlug}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSlug]);

  // A blank field means "any", not "none" — so its place in this line says so explicitly rather
  // than silently disappearing, which otherwise reads as an unfiltered list rather than a
  // deliberately unrestricted one.
  const summary = [
    query.where || "Anywhere",
    query.what,
    query.date ? `${formatDay(query.date)}${query.time ? ` · ${query.time}` : ""}` : "Any time",
  ].filter(Boolean);

  const resetArea = () => {
    setArea(null);
    setMoved(false);
  };

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* List */}
      <section
        aria-label="Search results"
        className={`min-w-0 flex-col overflow-y-auto overscroll-contain ${
          view === "map" ? `hidden lg:flex ${expanded ? "lg:hidden" : "lg:w-[55%] xl:w-[62%]"}` : "flex w-full"
        }`}
      >
        <div className={`${view === "map" ? "" : "mx-auto w-full max-w-7xl "}px-5 pb-2 pt-5 sm:px-7`}>
          <h1 className="font-serif text-3xl leading-tight">{query.where ? `Studios in ${query.where}` : "All studios"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{summary.join(" · ")}</p>

          <div className="mt-4">{filterBar(false)}</div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
            <p className="text-sm text-foreground">
              {listed.length} {listed.length === 1 ? "studio" : "studios"}
              {area && <span className="text-muted-foreground"> in this area</span>}
            </p>
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {SORTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {area && (
              <button type="button" onClick={resetArea} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                Clear map area ✕
              </button>
            )}
            <div role="group" aria-label="Layout" className="ml-auto flex items-center gap-1">
              {(["grid", "list"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={layout === l}
                  aria-label={l === "grid" ? "Grid view" : "List view"}
                  onClick={() => setLayout(l)}
                  className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                    layout === l ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"
                  }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
                    {l === "grid" ? (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="1.5" />
                        <path d="M12 3v18M3 12h18" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="1.5" />
                        <path d="M3 9h18M3 15h18" />
                      </>
                    )}
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {listed.length === 0 ? (
          <div className={`${view === "map" ? "" : "mx-auto w-full max-w-7xl "}px-5 py-16 text-center sm:px-7`}>
            <p className="text-foreground">No studios match this search.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {area ? "Try zooming the map out or clearing the area." : "Try a different treatment or location."}
            </p>
            <Link href="/search" className={`${pillClass()} mt-5`}>
              See all studios
            </Link>
          </div>
        ) : (
          <ul className={`${view === "map" ? "" : "mx-auto w-full max-w-7xl "}gap-4 px-5 pb-24 pt-2 sm:px-7 lg:pb-8 ${layout === "list" ? "flex flex-col" : view === "map" ? "grid sm:grid-cols-2" : "grid sm:grid-cols-2 xl:grid-cols-3"}`}>
            {listed.map((r) => (
              <li key={r.slug} id={`card-${r.slug}`}>
                <ResultCard
                  r={r}
                  layout={layout === "list" ? "row" : "stack"}
                  highlighted={r.slug === activeSlug || r.slug === hoverSlug}
                  onHover={(on) => setHoverSlug(on ? r.slug : null)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Map */}
      <section
        aria-label="Map"
        className={`relative flex-1 overflow-hidden bg-muted ${view === "map" ? "block" : "hidden"}`}
      >
        {view === "map" && (
        <StudioMap
          studios={area ? listed : filtered}
          fitKey={fitKey}
          fit={!area}
          activeSlug={activeSlug}
          hoverSlug={hoverSlug}
          onSelect={setActiveSlug}
          onMoveEnd={(b, byUser) => {
            setLatest(b);
            if (byUser) setMoved(true);
          }}
        />
        )}

        {/* Floating controls: treatment filters top-left, view toggle top-right. */}
        <div className={`absolute left-4 right-4 top-4 z-10 lg:right-80 ${expanded ? "" : "lg:hidden"}`}>{filterBar(true)}</div>

        <div className="absolute right-4 top-4 z-10 hidden items-center gap-2 lg:flex">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-card px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-foreground shadow-[var(--shadow-floating)] transition-colors hover:bg-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {expanded ? (
              <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
            ) : (
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            )}
          </svg>
          {expanded ? "Reduce map view" : "Expand map"}
        </button>
        <button
          type="button"
          onClick={() => {
            setView("list");
            setExpanded(false);
            setActiveSlug(null);
          }}
          aria-label="Close map"
          className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-card text-foreground shadow-[var(--shadow-floating)] transition-colors hover:bg-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        </div>

        {moved && latest && (
          <button
            type="button"
            onClick={() => {
              setArea(latest);
              setMoved(false);
              setActiveSlug(null);
            }}
            className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-floating)] transition-colors hover:bg-muted"
          >
            Search this area
          </button>
        )}
      </section>

      {/* List view: a pill pinned to the bottom opens the map. */}
      {view === "list" && (
        <button
          type="button"
          onClick={() => {
            setView("map");
            setExpanded(true);
          }}
          className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-[var(--shadow-floating)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4ZM9 4v13M15 7v13" />
          </svg>
          View on map
        </button>
      )}

      {/* Phones in map view: back to the list. The list itself never offers the map. */}
      {view === "map" && (
        <button
          type="button"
          onClick={() => setView("list")}
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-[var(--shadow-floating)] lg:hidden"
        >
          Show list
        </button>
      )}
    </div>
  );
}

function ResultCard({
  r,
  layout,
  highlighted,
  onHover,
}: {
  r: SearchResult;
  /** "stack": photo on top (grid). "row": photo beside the text (list). */
  layout: "stack" | "row";
  highlighted: boolean;
  onHover: (on: boolean) => void;
}) {
  return (
    <Link
      href={`/providers/${r.slug}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className={`group flex h-full gap-4 rounded-[var(--radius-lg)] border bg-card p-3 transition-shadow duration-150 ${layout === "stack" ? "flex-col" : ""} ${
        highlighted ? "border-foreground/40 shadow-[var(--shadow-floating)]" : "border-border"
      }`}
    >
      <span className={`relative aspect-[4/3] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-muted ${layout === "stack" ? "w-full" : "w-32 sm:w-44"}`}>
        <Image src={r.image} alt="" fill sizes="176px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
        {r.isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">New</span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col py-0.5">
        <span className="truncate text-base font-medium text-foreground">{r.name}</span>
        <span className="truncate text-sm text-muted-foreground">
          {r.city}, {r.region}
        </span>
        <span className="mt-1 hidden line-clamp-2 text-sm text-muted-foreground sm:block">{r.blurb}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm">
          <span className="text-foreground">
            {r.isNew ? "New to Zennly" : (
              <>★ {r.rating.toFixed(1)} <span className="text-muted-foreground">({r.reviewCount})</span></>
            )}
          </span>
          <span className="text-muted-foreground">{r.modalities.slice(0, 2).join(" · ")}</span>
          <span className="ml-auto font-medium text-foreground">from <Price usd={r.fromPrice} engineProviderId={r.engineProviderId} /></span>
        </span>
      </span>
    </Link>
  );
}
