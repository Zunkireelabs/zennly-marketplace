"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { SearchIndex } from "@/lib/home-rails";
import { pillClass } from "@/components/ui/pill";
import { useCurrency } from "@/lib/currency/use-currency";

export type SearchItem = {
  kind: "category" | "treatment" | "studio";
  key: string;
  label: string;
  sub: string;
  /** Text the "What" field takes when picked (treatments and categories). */
  fill?: string;
  /** Studios navigate here instead of filling the field. */
  href?: string;
  image?: string;
};

export type SearchTab = "all" | "treatments" | "studios";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Everything the "What" panel shows, derived from the search index: treatments (left column),
 * studios (right column), and the flat list the input uses for arrow-key navigation.
 * `city` scopes studios (and so category counts and treatments) to the city picked in "Where".
 */
export function useSearchResults(
  index: SearchIndex,
  rawQuery: string,
  tab: SearchTab,
  city: string | null,
) {
  const { format } = useCurrency();
  return useMemo(() => {
    const q = norm(rawQuery.trim());
    const studios = city
      ? index.studios.filter((s) => s.city === city)
      : index.studios;
    const studioBySlug = new Map(studios.map((s) => [s.slug, s]));

    const categoryNames = Array.from(
      new Set(studios.flatMap((s) => s.modalities)),
    );
    const categories: SearchItem[] = categoryNames
      .map((name) => ({
        name,
        count: studios.filter((s) => s.modalities.includes(name)).length,
      }))
      .filter((c) => !q || norm(c.name).includes(q))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((c) => ({
        kind: "category" as const,
        key: `c-${c.name}`,
        label: c.name,
        sub: plural(c.count, "studio"),
        fill: c.name,
      }));

    // Specific treatments only appear once someone types; the empty state stays a clean
    // category browse.
    const treatments: SearchItem[] = q
      ? index.treatments
          .filter((t) => norm(t.name).includes(q))
          .flatMap((t) => {
            const here = t.studios.filter((slug) => studioBySlug.has(slug));
            if (here.length === 0) return [];
            return [
              {
                kind: "treatment" as const,
                key: `t-${t.name}`,
                label: t.name,
                sub: `from ${format(t.fromPrice)} · ${plural(here.length, "studio")}`,
                fill: t.name,
              },
            ];
          })
      : [];

    const studioItems: SearchItem[] = studios
      .filter(
        (s) =>
          !q ||
          norm(s.name).includes(q) ||
          norm(`${s.city} ${s.region}`).includes(q) ||
          s.modalities.some((m) => norm(m).includes(q)),
      )
      .sort((a, b) => b.rating - a.rating)
      .map((s) => ({
        kind: "studio" as const,
        key: `s-${s.slug}`,
        label: s.name,
        sub: `${s.city}, ${s.region} · ★ ${s.rating.toFixed(1)}`,
        image: s.image,
        href: `/providers/${s.slug}`,
      }));

    // In the two-column "All" view the lists are capped so the panel stays scannable; each
    // single-column tab shows everything.
    const allTreatments = [...categories, ...treatments];
    const shownTreatments =
      tab === "all" && q ? allTreatments.slice(0, 8) : allTreatments;
    const shownStudios = studioItems.slice(0, tab === "all" ? 10 : 50);
    const treatmentsOut = tab === "studios" ? [] : shownTreatments;
    const studiosOut = tab === "treatments" ? [] : shownStudios;

    return {
      counts: {
        all: allTreatments.length + studioItems.length,
        treatments: allTreatments.length,
        studios: studioItems.length,
      },
      treatments: treatmentsOut,
      studios: studiosOut,
      flat: [...treatmentsOut, ...studiosOut],
    };
  }, [index, rawQuery, tab, city, format]);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold">{text.slice(at, at + q.length)}</strong>
      {text.slice(at + q.length)}
    </>
  );
}

const ICON_PATHS: Record<string, React.ReactNode> = {
  massage: (
    <path d="M3 15h18M5 15v4M19 15v4M6 15v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M8 10V8" />
  ),
  skincare: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 14a4 4 0 0 0 6 0M9.5 10v.01M14.5 10v.01" />
    </>
  ),
  sauna: (
    <path d="M8 4c-1.2 2 1.2 3 0 5.5M12 4c-1.2 2 1.2 3 0 5.5M16 4c-1.2 2 1.2 3 0 5.5M4 15h16M6 15v4M18 15v4" />
  ),
  cold: (
    <path d="M12 4s5.5 5.5 5.5 9.2a5.5 5.5 0 0 1-11 0C6.5 9.5 12 4 12 4Z" />
  ),
  yoga: (
    <>
      <circle cx="12" cy="5.5" r="1.7" />
      <path d="M12 8.5V13M6 11h12M7 20l5-7 5 7" />
    </>
  ),
  pilates: (
    <ellipse cx="12" cy="12" rx="8" ry="4.5" transform="rotate(-30 12 12)" />
  ),
  breath: <path d="M3 9h10a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3M3 12h6" />,
  hair: (
    <>
      <circle cx="6.5" cy="7" r="2" />
      <circle cx="6.5" cy="17" r="2" />
      <path d="M8.2 8.2 20 17M8.2 15.8 20 7" />
    </>
  ),
  lash: (
    <>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  makeup: <path d="M9 21v-7h6v7zM10 14V9l3.5-5L15 6v8" />,
  float: <path d="M3 10c3-2 6 2 9 0s6 2 9 0M3 15c3-2 6 2 9 0s6 2 9 0" />,
};

function iconFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("massage") || n.includes("body")) return "massage";
  if (n.includes("skin") || n.includes("facial")) return "skincare";
  if (n.includes("sauna") || n.includes("heat")) return "sauna";
  if (
    n.includes("cold") ||
    n.includes("plunge") ||
    n.includes("recover") ||
    n.includes("cryo")
  )
    return "cold";
  if (n.includes("yoga")) return "yoga";
  if (n.includes("pilates")) return "pilates";
  if (n.includes("breath")) return "breath";
  if (n.includes("hair") || n.includes("cut")) return "hair";
  if (n.includes("lash") || n.includes("brow")) return "lash";
  if (n.includes("makeup")) return "makeup";
  if (n.includes("float")) return "float";
  return "skincare";
}

function CategoryIcon({ name }: { name: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICON_PATHS[iconFor(name)]}
    </svg>
  );
}

export function TreatmentPanel({
  results,
  query,
  tab,
  onTab,
  activeKey,
  onActive,
  onPick,
  cityLabel,
  onClearCity,
}: {
  results: ReturnType<typeof useSearchResults>;
  query: string;
  tab: SearchTab;
  onTab: (t: SearchTab) => void;
  activeKey: string | null;
  onActive: (key: string) => void;
  onPick: (item: SearchItem) => void;
  cityLabel: string | null;
  onClearCity: () => void;
}) {
  const typed = query.trim().length > 0;
  const keep = (e: React.MouseEvent) => e.preventDefault(); // keep focus in the input
  const tabs: { id: SearchTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: results.counts.all },
    { id: "treatments", label: "Treatments", count: results.counts.treatments },
    { id: "studios", label: "Studios", count: results.counts.studios },
  ];
  const split = tab === "all";

  return (
    <div className="max-h-[70vh] overflow-y-auto overscroll-contain p-5 [scrollbar-width:none] sm:max-h-none sm:overflow-visible sm:p-7 [&::-webkit-scrollbar]:hidden">
      <div
        role="tablist"
        aria-label="Search by"
        className="mb-5 flex flex-wrap gap-2"
      >
        {tabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onMouseDown={keep}
              onClick={() => onTab(t.id)}
              className={pillClass({ selected: on, size: "sm" })}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${on ? "bg-background/20" : "bg-muted text-muted-foreground"}`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="hero-what-results"
        role="listbox"
        className={`grid gap-6 sm:gap-7 ${split ? "sm:grid-cols-[minmax(0,16rem)_1px_minmax(0,1fr)]" : ""}`}
      >
        {/* Left: fixed. Treatment categories (and, once typing, matching treatments). */}
        {tab !== "studios" && (
          <div className="sm:max-h-[calc(70vh-6.5rem)] sm:overflow-y-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
            <p className="mb-3 text-xs font-medium text-foreground">
              {typed ? "Treatments" : "Browse treatments"}
            </p>
            {results.treatments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No treatments match.
              </p>
            ) : (
              <ul
                className={
                  split
                    ? "flex flex-col"
                    : "grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {results.treatments.map((item) => {
                  const on = item.key === activeKey;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-key={item.key}
                        onMouseDown={keep}
                        onMouseEnter={() => onActive(item.key)}
                        onClick={() => onPick(item)}
                        className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-1 py-2.5 text-left text-sm text-foreground transition-colors ${on ? "bg-muted" : ""}`}
                      >
                        <span className="shrink-0 text-muted-foreground">
                          <CategoryIcon name={item.label} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            <Highlight text={item.label} query={query} />
                          </span>
                          {item.kind === "treatment" && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.sub}
                            </span>
                          )}
                        </span>
                        {item.kind === "category" && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.sub.split(" ")[0]}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {split && <div className="hidden bg-border sm:block" />}

        {/* Right: scrolls on its own. Studios as photo cards, same as the city cards. */}
        {tab !== "treatments" && (
          <div className="overscroll-contain sm:max-h-[calc(70vh-6.5rem)] sm:overflow-y-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-foreground">
                {typed ? "Studios" : "Top-rated studios"}
              </p>
              {cityLabel && (
                <button
                  type="button"
                  onMouseDown={keep}
                  onClick={onClearCity}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  In {cityLabel} <span aria-hidden>✕</span>
                  <span className="sr-only">Clear location</span>
                </button>
              )}
            </div>
            {results.studios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {typed ? (
                  <>
                    No studios match &ldquo;{query}&rdquo;
                    {cityLabel ? ` in ${cityLabel}` : ""}.
                  </>
                ) : (
                  "No studios here yet."
                )}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                {results.studios.map((item) => {
                  const on = item.key === activeKey;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-key={item.key}
                        onMouseDown={keep}
                        onMouseEnter={() => onActive(item.key)}
                        onClick={() => onPick(item)}
                        className="group block w-full text-left"
                      >
                        <span
                          className={`relative block aspect-[3/2] overflow-hidden rounded-[var(--radius-sm)] bg-muted transition-shadow ${on ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
                        >
                          {item.image && (
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              sizes="200px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                        </span>
                        <span className="mt-2 block truncate text-sm text-foreground">
                          <Highlight text={item.label} query={query} />
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.sub}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
