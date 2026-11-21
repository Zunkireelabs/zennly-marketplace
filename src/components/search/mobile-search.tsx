"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Destination } from "@/lib/home-rails";
import { nearestDestination } from "@/lib/search/near-me";
import { ANY_TIME, DateTimePanel, formatDay } from "@/components/home/date-time-panel";
import { TreatmentPanel, useSearchResults, type SearchItem, type SearchTab } from "@/components/home/treatment-search";

/**
 * The two full-screen mobile search overlays (location picker, search form). Purely
 * presentational: every value it shows and every change it makes travels through props into
 * `SearchBar`'s own `where`/`what`/`date`/`time`/`active` state — this component holds no copy of
 * any of it, so the collapsed pill, this sheet, and `/search` can never disagree about what was
 * actually selected.
 */

type Props = {
  screen: "location" | "form";
  destinations: Destination[];
  // The location sheet's own combined search — separate from `where`/`what`, see search-bar.tsx.
  sheetQuery: string;
  sheetMatches: Destination[];
  sheetResults: ReturnType<typeof useSearchResults>;
  where: string;
  what: string;
  date: string;
  time: string;
  active: "where" | "what" | "when" | null;
  results: ReturnType<typeof useSearchResults>;
  tab: SearchTab;
  effectiveKey: string | null;
  onSheetQueryChange: (value: string) => void;
  onPickDestination: (d: Destination) => void;
  onPickSearchItem: (item: SearchItem) => void;
  onChevron: () => void;
  onTapWhere: () => void;
  onSetActive: (active: "what" | "when" | null) => void;
  onActiveKey: (key: string) => void;
  onPick: (item: SearchItem) => void;
  onWhatChange: (value: string) => void;
  onWhatEnter: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClearCity: () => void;
  onClearWhere: () => void;
  onClearWhat: () => void;
  onTab: (tab: SearchTab) => void;
  onDate: (key: string) => void;
  onTime: (time: string) => void;
  onClearDateTime: () => void;
  onClearAll: () => void;
  onSearch: () => void;
};

const CARD = "flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] bg-muted px-4 py-3 text-left";
const CARD_LABEL = "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground";

/**
 * A field's own clear control — a sibling of the card's tap-to-open button, never nested inside
 * it. Nesting interactive elements is invalid HTML and is exactly how 8e6e68d's Profile/Log-out
 * mixup happened (a tap meant for one control landing on its neighbour because they shared a hit
 * area). 44x44 touch target even though the glyph drawn inside is small, and a real gap from the
 * label button next to it — the two must never share a pixel.
 */
function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden>✕</span>
    </button>
  );
}

export function MobileSearchSheet(props: Props) {
  // Portalled to <body>: this is a full-screen takeover and must sit above EVERYTHING, including
  // the site header. Rendered in place (nested under the hero's own stacking context), the
  // header's z-30 still won against this component's local z-50 — the hero wrapper that contains
  // this component has its own lower z-index, and a child's z-index only ever competes within its
  // parent's stacking context, never past it. A portal sidesteps that entirely.
  return createPortal(
    <div
      id="mobile-search-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={props.screen === "location" ? "Search a city or area" : "Search for studios"}
      className="fixed inset-0 z-50 flex h-dvh flex-col bg-card sm:hidden"
    >
      {props.screen === "location" ? <LocationScreen {...props} /> : <FormScreen {...props} />}
    </div>,
    document.body,
  );
}

function ChevronButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}

const LOCATION_PIN = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="shrink-0 text-muted-foreground">
    <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const STUDIO_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground">
    <path d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z" />
  </svg>
);

const SERVICE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

/** One row shape shared by all three groups: icon, label, muted detail on the right. */
function SheetRow({ icon, label, detail, onClick }: { icon: React.ReactNode; label: string; detail?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-border py-3.5 text-left">
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
        {detail && <span className="shrink-0 text-xs text-muted-foreground">{detail}</span>}
      </button>
    </li>
  );
}

function LocationScreen({ destinations, sheetQuery, sheetMatches, sheetResults, onSheetQueryChange, onPickDestination, onPickSearchItem, onChevron }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNearMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearMeError("We couldn't get your location.");
      return;
    }
    setNearMeError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const nearest = nearestDestination(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          destinations,
        );
        if (!nearest) {
          setNearMeError("We couldn't get your location.");
          return;
        }
        onPickDestination(nearest);
      },
      (err) => {
        setLocating(false);
        // Browsers refuse geolocation outright on an insecure origin, and report it as
        // PERMISSION_DENIED — identical to the visitor tapping "Block". Saying "you can turn
        // this on" to someone who was never asked sends them hunting through settings for a
        // switch that isn't there. Production is HTTPS so this only bites over http on a LAN
        // address, which is exactly how this project is tested on a real phone.
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setNearMeError("Finding you needs a secure connection.");
          return;
        }
        setNearMeError(
          err.code === err.PERMISSION_DENIED
            ? "Location is off for this site."
            : "We couldn't get your location."
        );
      },
    );
  };

  const typed = sheetQuery.trim().length > 0;
  const nothingFound = typed && sheetMatches.length === 0 && sheetResults.studios.length === 0 && sheetResults.treatments.length === 0;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <ChevronButton label="Back to search form" onClick={onChevron} />
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={sheetQuery}
          onChange={(e) => onSheetQueryChange(e.target.value)}
          placeholder="Search Location/Studios/Services"
          className="min-w-0 flex-1 border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!typed && (
          <>
            <button
              type="button"
              onClick={handleNearMe}
              disabled={locating}
              className="flex w-full items-center gap-3 border-b border-border py-3.5 text-left disabled:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M22 12h-3M5 12H2" />
              </svg>
              <span className="text-sm font-medium text-foreground">
                {locating ? "Finding you…" : "Use current location"}
              </span>
            </button>
            {nearMeError && <p className="pt-2 text-sm text-muted-foreground">{nearMeError}</p>}
          </>
        )}

        {nothingFound ? (
          <p className="py-6 text-sm text-muted-foreground">No studios in &ldquo;{sheetQuery}&rdquo; yet.</p>
        ) : (
          <>
            {sheetMatches.length > 0 && (
              <section>
                {/* No heading in the untyped (empty-query) state — that screen is unchanged from
                    before this feature: a bare list, not a "Locations" group among others. */}
                {typed && <p className="pt-3 pb-1 text-xs font-medium text-foreground">Locations</p>}
                <ul className="flex flex-col">
                  {sheetMatches.map((d) => (
                    <SheetRow
                      key={d.city}
                      icon={LOCATION_PIN}
                      label={`${d.city}, ${d.region}`}
                      detail={`${d.count} ${d.count === 1 ? "studio" : "studios"}`}
                      onClick={() => onPickDestination(d)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {typed && sheetResults.studios.length > 0 && (
              <section>
                <p className="pt-3 pb-1 text-xs font-medium text-foreground">Studios</p>
                <ul className="flex flex-col">
                  {sheetResults.studios.map((item) => (
                    <SheetRow key={item.key} icon={STUDIO_ICON} label={item.label} detail={item.sub} onClick={() => onPickSearchItem(item)} />
                  ))}
                </ul>
              </section>
            )}

            {typed && sheetResults.treatments.length > 0 && (
              <section>
                <p className="pt-3 pb-1 text-xs font-medium text-foreground">Services</p>
                <ul className="flex flex-col">
                  {sheetResults.treatments.map((item) => (
                    <SheetRow key={item.key} icon={SERVICE_ICON} label={item.label} detail={item.sub} onClick={() => onPickSearchItem(item)} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function FormScreen({
  where,
  what,
  date,
  time,
  active,
  results,
  tab,
  effectiveKey,
  onChevron,
  onTapWhere,
  onSetActive,
  onActiveKey,
  onPick,
  onClearCity,
  onClearWhere,
  onClearWhat,
  onWhatChange,
  onWhatEnter,
  onTab,
  onDate,
  onTime,
  onClearDateTime,
  onClearAll,
  onSearch,
}: Props) {
  const anySet = Boolean(where || what || date || time);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <ChevronButton label="Close search" onClick={onChevron} />
        <p className="flex-1 text-sm font-semibold text-foreground">Search for studios</p>
        {/* Only shown when there's something to clear — a permanently-dead control here would
            just train people to ignore this corner of the screen. */}
        {anySet && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex h-11 min-w-11 items-center justify-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className={CARD}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onTapWhere} className="min-w-0 flex-1 text-left">
              <span className={CARD_LABEL}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                Where
              </span>
              <span className={`truncate text-sm ${where ? "text-foreground" : "text-muted-foreground"}`}>
                {where || "Anywhere"}
              </span>
            </button>
            {where && <ClearButton label="Clear location" onClick={onClearWhere} />}
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onSetActive(active === "what" ? null : "what")} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
              <span className={CARD_LABEL}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
                What
              </span>
              <span className={`truncate text-sm ${what ? "text-foreground" : "text-muted-foreground"}`}>
                {what || "Anything"}
              </span>
            </button>
            {what && <ClearButton label="Clear treatment" onClick={onClearWhat} />}
          </div>
          {active === "what" && (
            <div className="-mx-4 mt-2 border-t border-border">
              {/* TreatmentPanel only ever renders results — on desktop the actual typing
                  happens in the bar's own `<input id="hero-search-treatment">`, which is
                  `sm:`-only and doesn't exist on this screen. Same input shape as the location
                  picker's search box, which already works this way. */}
              <input
                type="text"
                autoComplete="off"
                autoFocus
                value={what}
                onChange={(e) => onWhatChange(e.target.value)}
                onKeyDown={onWhatEnter}
                placeholder="Treatment, studio…"
                className="w-full border-none bg-transparent px-4 pb-1 pt-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <TreatmentPanel
                results={results}
                query={what}
                tab={tab}
                onTab={onTab}
                activeKey={effectiveKey}
                onActive={onActiveKey}
                onPick={onPick}
                cityLabel={null}
                onClearCity={onClearCity}
              />
            </div>
          )}
        </div>

        <div className={CARD}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onSetActive(active === "when" ? null : "when")} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
              <span className={CARD_LABEL}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></svg>
                When
              </span>
              <span className={`truncate text-sm ${date ? "text-foreground" : "text-muted-foreground"}`}>
                {date ? `${formatDay(date)}${time ? ` · ${time}` : ""}` : "Any time"}
              </span>
            </button>
            {(date || time) && <ClearButton label="Clear date and time" onClick={onClearDateTime} />}
          </div>
          {active === "when" && (
            <div className="-mx-4 mt-2 border-t border-border">
              <DateTimePanel
                date={date}
                time={time}
                onDate={(d) => {
                  onDate(d);
                  if (!time) onTime(ANY_TIME);
                }}
                onTime={onTime}
                onClear={onClearDateTime}
                onDone={() => onSetActive(null)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={onSearch}
          className="h-12 w-full rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Search
        </button>
      </div>
    </>
  );
}
