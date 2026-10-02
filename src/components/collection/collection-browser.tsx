"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/provider/icons";
import { ListingRow, type CollectionItem } from "./listing-row";
import { Price } from "@/components/ui/price";
import { CurrencySwitch } from "@/components/layout/currency-picker";
import { CURRENCIES } from "@/lib/currency/currencies";
import { useCurrency } from "@/lib/currency/use-currency";

const OVERLINE =
  "font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

const PAGE_SIZE = 4;
const STRIP_AFTER = 3;

type SortKey = "loved" | "rated" | "price";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "loved", label: "Most loved" },
  { key: "rated", label: "Top rated" },
  { key: "price", label: "Price: low to high" },
];

type Groups = { services: Set<string>; cities: Set<string>; features: Set<string>; greatFor: Set<string> };
const emptyGroups = (): Groups => ({
  services: new Set(),
  cities: new Set(),
  features: new Set(),
  greatFor: new Set(),
});

/** Options per group, with the count of providers in this collection that match. */
function tally(items: CollectionItem[], pick: (i: CollectionItem) => string[]) {
  const counts = new Map<string, number>();
  for (const item of items) for (const v of new Set(pick(item))) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function matches(item: CollectionItem, g: Groups, maxPrice: number) {
  if (item.fromPrice > maxPrice) return false;
  if (g.services.size && !item.modalities.some((m) => g.services.has(m))) return false;
  if (g.cities.size && !g.cities.has(item.city)) return false;
  if (g.features.size && !item.amenities.some((a) => g.features.has(a))) return false;
  if (g.greatFor.size && !item.greatFor.some((a) => g.greatFor.has(a))) return false;
  return true;
}

export function CollectionBrowser({
  items,
  title,
  intro,
}: {
  items: CollectionItem[];
  title: string;
  intro: string;
}) {
  const priceFloor = Math.min(...items.map((i) => i.fromPrice));
  const priceCeil = Math.max(...items.map((i) => i.fromPrice));

  const [groups, setGroups] = useState<Groups>(emptyGroups);
  const [maxPrice, setMaxPrice] = useState(priceCeil);
  const [sort, setSort] = useState<SortKey>("loved");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);

  const options = useMemo(
    () => ({
      services: tally(items, (i) => i.modalities),
      cities: tally(items, (i) => [i.city]),
      features: tally(items, (i) => i.amenities),
      greatFor: tally(items, (i) => i.greatFor),
    }),
    [items]
  );

  const results = useMemo(() => {
    const filtered = items.filter((i) => matches(i, groups, maxPrice));
    const sorted = [...filtered];
    if (sort === "rated") sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    if (sort === "price") sorted.sort((a, b) => a.fromPrice - b.fromPrice);
    // "loved" keeps the editorial order from the collection.
    return sorted;
  }, [items, groups, maxPrice, sort]);

  const activeCount =
    groups.services.size +
    groups.cities.size +
    groups.features.size +
    groups.greatFor.size +
    (maxPrice < priceCeil ? 1 : 0);

  function toggle(group: keyof Groups, value: string) {
    setGroups((prev) => {
      const next = { ...prev, [group]: new Set(prev[group]) };
      if (next[group].has(value)) next[group].delete(value);
      else next[group].add(value);
      return next;
    });
    setVisible(PAGE_SIZE);
  }

  function clearAll() {
    setGroups(emptyGroups());
    setMaxPrice(priceCeil);
    setVisible(PAGE_SIZE);
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const filters = (
    <FilterPanel
      groups={groups}
      options={options}
      maxPrice={maxPrice}
      priceFloor={priceFloor}
      priceCeil={priceCeil}
      onPrice={(v) => {
        setMaxPrice(v);
        setVisible(PAGE_SIZE);
      }}
      onToggle={toggle}
      onClear={clearAll}
      activeCount={activeCount}
    />
  );

  const shown = results.slice(0, visible);

  return (
    <div className="grid gap-10 pb-8 pt-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sidebar, desktop */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
          {filters}
        </div>
      </aside>

      <div className="min-w-0">
        <header>
          <p className={OVERLINE}>Collection · {items.length} studios</p>
          <h1 className="mt-2 font-[family-name:var(--font-instrument-serif)] text-5xl leading-[1.05] text-foreground sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{intro}</p>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {Math.min(shown.length, results.length)} of {results.length}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-[var(--radius-sm)] border border-border bg-card px-3 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-10 text-center">
            <p className="text-lg font-semibold text-foreground">No studios match those filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try removing one, or start again.</p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-5 rounded-[var(--radius-md)] border-[1.5px] border-primary px-5 py-2.5 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {shown.map((item, i) => (
              <div key={item.slug} className="contents">
                <ListingRow item={item} priority={i === 0} />
                {i === STRIP_AFTER - 1 && results.length > STRIP_AFTER && <InsideStrip items={results} />}
              </div>
            ))}
          </div>
        )}

        {visible < results.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-[var(--radius-md)] border-[1.5px] border-primary px-8 py-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Show more
            </button>
          </div>
        )}
      </div>

      {/* Filter sheet, mobile and tablet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-[var(--radius-lg)] bg-background shadow-[0_12px_32px_rgba(35,33,29,0.14)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-base font-semibold text-foreground">Filters</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="flex size-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{filters}</div>
            <div className="border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full rounded-[var(--radius-md)] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Show {results.length} {results.length === 1 ? "studio" : "studios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

type Options = Record<keyof Groups, [string, number][]>;

function FilterPanel({
  groups,
  options,
  maxPrice,
  priceFloor,
  priceCeil,
  onPrice,
  onToggle,
  onClear,
  activeCount,
}: {
  groups: Groups;
  options: Options;
  maxPrice: number;
  priceFloor: number;
  priceCeil: number;
  onPrice: (v: number) => void;
  onToggle: (group: keyof Groups, value: string) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const { currency, toDisplay } = useCurrency();
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-foreground">Filters</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {priceCeil > priceFloor && (
        <div>
          <p className={OVERLINE}>Price from</p>
          <div className="mt-2">
            <CurrencySwitch />
          </div>
          <input
            type="range"
            min={toDisplay(priceFloor)}
            max={toDisplay(priceCeil)}
            step={CURRENCIES[currency].priceStep}
            value={toDisplay(maxPrice)}
            onChange={(e) => {
              const v = Number(e.target.value);
              // The top of the range means "no limit"; converting it back could round just under the dearest studio.
              onPrice(v >= toDisplay(priceCeil) ? priceCeil : v / CURRENCIES[currency].rate);
            }}
            aria-label="Maximum starting price"
            className="mt-3 w-full accent-primary"
          />
          <div className="mt-1 flex justify-between font-[family-name:var(--font-space-mono)] text-xs text-muted-foreground">
            <span><Price usd={priceFloor} /></span>
            <span className="text-foreground">Up to <Price usd={maxPrice} /></span>
          </div>
        </div>
      )}

      <FilterGroup title="Service" group="services" options={options.services} groups={groups} onToggle={onToggle} />
      {options.cities.length > 1 && (
        <FilterGroup title="City" group="cities" options={options.cities} groups={groups} onToggle={onToggle} />
      )}
      <FilterGroup title="Features" group="features" options={options.features} groups={groups} onToggle={onToggle} />
      <FilterGroup title="Great for" group="greatFor" options={options.greatFor} groups={groups} onToggle={onToggle} />
    </div>
  );
}

function FilterGroup({
  title,
  group,
  options,
  groups,
  onToggle,
}: {
  title: string;
  group: keyof Groups;
  options: [string, number][];
  groups: Groups;
  onToggle: (group: keyof Groups, value: string) => void;
}) {
  const [all, setAll] = useState(false);
  const LIMIT = 5;
  // Selected options stay visible even when the list is collapsed.
  const list = all
    ? options
    : options.filter(([v], i) => i < LIMIT || groups[group].has(v));

  return (
    <fieldset className="border-t border-border pt-5">
      <legend className={cn(OVERLINE, "float-left mb-3 w-full")}>{title}</legend>
      <div className="clear-both flex flex-col gap-2.5">
        {list.map(([value, count]) => (
          <label key={value} className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={groups[group].has(value)}
              onChange={() => onToggle(group, value)}
              className="size-4 rounded-[4px] accent-primary"
            />
            <span className="flex-1">{value}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </label>
        ))}
      </div>
      {options.length > LIMIT && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="mt-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {all ? "See less" : "See more"}
        </button>
      )}
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/* Mid-list strip                                                              */
/* -------------------------------------------------------------------------- */

function InsideStrip({ items }: { items: CollectionItem[] }) {
  return (
    <section
      aria-label="Take a look inside"
      className="rounded-[var(--radius-lg)] bg-muted px-5 py-6 sm:px-8"
    >
      <p className="text-base font-semibold text-foreground">Take a look inside</p>
      <ul className="mt-4 flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.slug} className="shrink-0">
            <Link
              href={`/providers/${item.slug}`}
              className="group flex w-20 flex-col items-center gap-2 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
            >
              <span className="relative block size-16 overflow-hidden rounded-[var(--radius-full)] ring-2 ring-primary ring-offset-2 ring-offset-muted">
                <Image src={item.images[0]} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-foreground group-hover:underline">
                {item.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
