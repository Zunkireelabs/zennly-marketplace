"use client";

import { useEffect, useRef, useState } from "react";
import { pillClass } from "@/components/ui/pill";
import { useCurrency } from "@/lib/currency/use-currency";
import { CURRENCIES } from "@/lib/currency/currencies";

export type Filters = {
  treatments: string[];
  minPrice: string;
  maxPrice: string;
  /** 0 means any rating. */
  minRating: number;
  onlyNew: boolean;
};

export const NO_FILTERS: Filters = { treatments: [], minPrice: "", maxPrice: "", minRating: 0, onlyNew: false };

type Menu = "all" | "treatment" | "budget" | "rating";

const RATINGS = [
  { value: 0, label: "Any rating" },
  { value: 4, label: "4.0 and up" },
  { value: 4.5, label: "4.5 and up" },
  { value: 4.8, label: "4.8 and up" },
];

const money = (v: string, symbol: string) => (v ? `${symbol}${v}` : "");

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-5 shrink-0 items-center justify-center rounded-[5px] border ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}
    >
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </span>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-foreground" : "border-border"}`}>
      {on && <span className="size-2.5 rounded-full bg-foreground" />}
    </span>
  );
}

function TreatmentList({
  filters,
  onChange,
  treatments,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  treatments: [string, number][];
}) {
  return (
    <ul className="flex flex-col">
      {treatments.map(([name, count]) => {
        const on = filters.treatments.includes(name);
        return (
          <li key={name}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() =>
                onChange({ ...filters, treatments: on ? filters.treatments.filter((t) => t !== name) : [...filters.treatments, name] })
              }
              className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-1 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              <Check on={on} />
              <span className="flex-1">{name}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BudgetFields({ filters, onChange, bounds }: { filters: Filters; onChange: (f: Filters) => void; bounds: { min: number; max: number } }) {
  const field = "h-11 w-full min-w-0 rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none";
  const { currency } = useCurrency();
  const symbol = CURRENCIES[currency].symbol;
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 7);
  return (
    <div>
      <div className="flex items-center gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">From</span>
          <input
            inputMode="numeric"
            placeholder={`${symbol}${bounds.min}`}
            value={money(filters.minPrice, symbol)}
            onChange={(e) => onChange({ ...filters, minPrice: digits(e.target.value) })}
            className={field}
          />
        </label>
        <span className="mt-5 text-muted-foreground" aria-hidden>
          –
        </span>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">To</span>
          <input
            inputMode="numeric"
            placeholder={`${symbol}${bounds.max}`}
            value={money(filters.maxPrice, symbol)}
            onChange={(e) => onChange({ ...filters, maxPrice: digits(e.target.value) })}
            className={field}
          />
        </label>
      </div>
      <div className="mt-3">
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Starting price per visit.</p>
    </div>
  );
}

function RatingList({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <ul className="flex flex-col">
      {RATINGS.map((r) => (
        <li key={r.value}>
          <button
            type="button"
            role="radio"
            aria-checked={filters.minRating === r.value}
            onClick={() => onChange({ ...filters, minRating: r.value })}
            className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-1 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Radio on={filters.minRating === r.value} />
            {r.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Filter chips in the Le Collectionist style: ALL FILTERS, then one chip per filter group that
 * each open a small popover. Used floating over the map and inline above the list.
 */
export function FilterBar({
  filters,
  onChange,
  treatments,
  bounds,
  count,
  floating,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  treatments: [string, number][];
  bounds: { min: number; max: number };
  /** Studios matching the current filters, shown on the "See N studios" button. */
  count: number;
  floating: boolean;
}) {
  const [open, setOpen] = useState<Menu | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const budgetOn = Boolean(filters.minPrice || filters.maxPrice);
  const activeCount =
    (filters.treatments.length ? 1 : 0) + (budgetOn ? 1 : 0) + (filters.minRating ? 1 : 0) + (filters.onlyNew ? 1 : 0);

  // Tighter than the site-wide pill below `sm`: at 375px the four chips at full size overflow
  // and Rating drops to a second row. `flex-wrap` is kept as a safety valve rather than removed
  // — an applied filter lengthens its own label ("Treatment · 2", "$20 – $100+"), and wrapping
  // then is better than truncating. A horizontal scroller would be the usual answer but this
  // container anchors the dropdowns; `overflow-x` would clip them.
  const chip = (on: boolean) =>
    `${pillClass({ selected: on, floating })} max-sm:gap-1 max-sm:px-2 max-sm:py-3 max-sm:text-xs`;

  const popover = "absolute left-0 top-full z-30 mt-2 rounded-[var(--radius-lg)] bg-card p-4 shadow-[var(--shadow-floating)] ring-1 ring-border";
  const heading = "mb-2 text-xs font-medium text-foreground";

  const symbol = CURRENCIES[useCurrency().currency].symbol;
  const budgetLabel = budgetOn ? `${money(filters.minPrice, symbol) || `${symbol}${bounds.min}`} – ${money(filters.maxPrice, symbol) || `${symbol}${bounds.max}+`}` : "Budget";
  const treatmentLabel = filters.treatments.length ? `Treatment · ${filters.treatments.length}` : "Treatment";
  const ratingLabel = filters.minRating ? `${filters.minRating}+ rated` : "Rating";

  const toggle = (m: Menu) => setOpen(open === m ? null : m);

  return (
    <div ref={root} className="flex flex-wrap items-start gap-1.5 sm:gap-2">
      <div className="relative">
        <button type="button" aria-expanded={open === "all"} onClick={() => toggle("all")} className={chip(activeCount > 0)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
            <circle cx="15" cy="8" r="2" />
            <circle cx="9" cy="16" r="2" />
          </svg>
          <span className="sm:hidden">Filters</span>
          <span className="max-sm:hidden">All filters</span>
          {activeCount > 0 && ` · ${activeCount}`}
        </button>
        {open === "all" && (
          <div className={`${popover} flex max-h-[70vh] w-[min(24rem,calc(100vw-2rem))] flex-col p-0`}>
            <div className="flex-1 space-y-6 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <section>
                <p className={heading}>Treatment</p>
                <TreatmentList filters={filters} onChange={onChange} treatments={treatments} />
              </section>
              <section>
                <p className={heading}>Budget</p>
                <BudgetFields filters={filters} onChange={onChange} bounds={bounds} />
              </section>
              <section>
                <p className={heading}>Rating</p>
                <RatingList filters={filters} onChange={onChange} />
              </section>
              <section>
                <p className={heading}>Studios</p>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={filters.onlyNew}
                  onClick={() => onChange({ ...filters, onlyNew: !filters.onlyNew })}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-1 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Check on={filters.onlyNew} />
                  New to Zennly
                </button>
              </section>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <button
                type="button"
                onClick={() => onChange(NO_FILTERS)}
                disabled={activeCount === 0}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:no-underline disabled:opacity-40"
              >
                Erase all
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-[var(--radius-sm)] bg-foreground px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-background"
              >
                See {count} {count === 1 ? "studio" : "studios"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button type="button" aria-expanded={open === "treatment"} onClick={() => toggle("treatment")} className={chip(filters.treatments.length > 0)}>
          {treatmentLabel}
        </button>
        {open === "treatment" && (
          <div className={`${popover} max-h-[60vh] w-64 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
            <TreatmentList filters={filters} onChange={onChange} treatments={treatments} />
          </div>
        )}
      </div>

      <div className="relative">
        <button type="button" aria-expanded={open === "budget"} onClick={() => toggle("budget")} className={chip(budgetOn)}>
          {budgetLabel}
        </button>
        {open === "budget" && (
          <div className={`${popover} w-72`}>
            <BudgetFields filters={filters} onChange={onChange} bounds={bounds} />
          </div>
        )}
      </div>

      <div className="relative">
        <button type="button" aria-expanded={open === "rating"} onClick={() => toggle("rating")} className={chip(filters.minRating > 0)}>
          {ratingLabel}
        </button>
        {open === "rating" && (
          <div className={`${popover} w-56`}>
            <RatingList filters={filters} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}
