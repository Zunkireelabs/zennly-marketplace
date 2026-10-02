"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as maplibregl from "maplibre-gl";
import type { SearchResult } from "@/lib/search";
import { MapSkeleton } from "./map-skeleton";
import { PopupCard } from "./popup-card";

// Free, keyless OpenStreetMap vector tiles (openfreemap.org). Liberty is its colourful street style, close to Mapbox Streets.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const US_CENTER: [number, number] = [-98, 39];

export type MapBounds = { north: number; south: number; east: number; west: number };

type Pin = SearchResult & { lat: number; lng: number };

const HOME_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>';
const PIN =
  "flex size-9 cursor-pointer items-center justify-center rounded-full border-2 shadow-md transition-transform duration-150 hover:scale-110";
const PIN_IDLE = "border-card bg-primary text-primary-foreground";
const PIN_ACTIVE = "border-card bg-foreground text-background scale-125";

export function StudioMap({
  studios,
  fitKey,
  fit,
  activeSlug,
  hoverSlug,
  onSelect,
  onMoveEnd,
}: {
  studios: SearchResult[];
  /** Changes when the studio set changes; the map refits to the pins. */
  fitKey: string;
  /** False while an area filter is on, so the map does not jump away from the area. */
  fit: boolean;
  activeSlug: string | null;
  hoverSlug: string | null;
  onSelect: (slug: string | null) => void;
  /** `byUser` is true for drags and zooms, false for the map's own fits and flights. */
  onMoveEnd: (bounds: MapBounds, byUser: boolean) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // The skeleton covers the map until the style and first tiles are in, then fades out and unmounts.
  const [ready, setReady] = useState(false);
  const [skeletonGone, setSkeletonGone] = useState(false);
  // Each pin's card host, refreshed whenever the pins are re-laid.
  const [hosts, setHosts] = useState<Map<string, { host: HTMLElement; below: boolean }>>(new Map());
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLElement; host: HTMLElement; slugs: string[] }>());
  // Latest props for the long-lived map handlers.
  const live = useRef({ studios, activeSlug, hoverSlug, onSelect, onMoveEnd, fit });

  useEffect(() => {
    live.current = { studios, activeSlug, hoverSlug, onSelect, onMoveEnd, fit };
  });

  const paint = () => {
    const { activeSlug: a, hoverSlug: h } = live.current;
    markers.current.forEach(({ el, slugs }) => {
      const on = slugs[0] === a || slugs[0] === h;
      el.className = `${PIN} ${on ? PIN_ACTIVE : PIN_IDLE}`;
      if (el.parentElement) el.parentElement.style.zIndex = on ? "10" : "";
    });
  };

  const render = () => {
    const map = mapRef.current;
    if (!map) return;
    const pins = live.current.studios.filter((s): s is Pin => s.lat != null && s.lng != null);
    const next = new Set(pins.map((p) => p.slug));

    markers.current.forEach((m, key) => {
      if (!next.has(key)) {
        m.marker.remove();
        markers.current.delete(key);
      }
    });
    for (const s of pins) {
      if (markers.current.has(s.slug)) continue;
      // MapLibre positions the outer element with an inline transform, so it must carry no transition or scale.
      // All styling and animation lives on the inner button.
      const wrap = document.createElement("div");
      const el = document.createElement("button");
      el.type = "button";
      wrap.className = "hover:z-20";
      wrap.appendChild(el);
      el.innerHTML = HOME_SVG;
      el.setAttribute("aria-label", `${s.name}, ${s.modality}`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        live.current.onSelect(s.slug);
      });
      // The card renders into this host via a portal. The map must not treat gestures on it as map input.
      const host = document.createElement("div");
      for (const type of ["click", "dblclick", "mousedown", "touchstart"]) {
        host.addEventListener(type, (e) => e.stopPropagation());
      }
      wrap.appendChild(host);
      const marker = new maplibregl.Marker({ element: wrap, anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(map);
      markers.current.set(s.slug, { marker, el, host, slugs: [s.slug] });
    }
    paint();
    setHosts(
      new Map(
        pins.flatMap((st) => {
          const m = markers.current.get(st.slug);
          return m ? [[st.slug, { host: m.host, below: map.project([st.lng, st.lat]).y < 290 }] as const] : [];
        })
      )
    );
  };

  // Create the map once.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    // Turbopack cannot resolve the library's own worker URL; serve it from /public (see scripts/copy-maplibre-worker.mjs).
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: node,
      style: STYLE_URL,
      center: US_CENTER,
      zoom: 3,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    // Reveal on load, or after a few seconds regardless so a failed tile request never hides the map.
    const reveal = () => setReady(true);
    map.once("load", reveal);
    const giveUp = window.setTimeout(reveal, 8000);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("click", () => live.current.onSelect(null));
    map.on("moveend", (e) => {
      render();
      const b = map.getBounds();
      // Drags, scroll-zoom and the zoom buttons carry an originalEvent; fits and flights do not.
      const byUser = Boolean((e as { originalEvent?: unknown }).originalEvent);
      live.current.onMoveEnd(
        { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
        byUser
      );
    });
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(node);
    const pins = markers.current;
    return () => {
      window.clearTimeout(giveUp);
      ro.disconnect();
      pins.forEach((m) => m.marker.remove());
      pins.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Studio set changed: rebuild pins, then refit unless an area filter is holding the view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.marker.remove());
    markers.current.clear();
    const run = () => {
      render();
      if (!live.current.fit) return;
      const pins = studios.filter((s) => s.lat != null && s.lng != null);
      if (pins.length === 0) return;
      const b = new maplibregl.LngLatBounds();
      pins.forEach((s) => b.extend([s.lng as number, s.lat as number]));
      map.fitBounds(b, { padding: 80, maxZoom: 12, duration: 600 });
    };
    if (map.loaded()) run();
    else map.once("load", run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, studios]);

  useEffect(paint, [activeSlug, hoverSlug]);

  // Unmount the skeleton once its fade-out (duration-300) has finished.
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setSkeletonGone(true), 350);
    return () => window.clearTimeout(id);
  }, [ready]);

  // Bring a selected pin into view (e.g. picked from the list).
  useEffect(() => {
    const map = mapRef.current;
    const s = studios.find((x) => x.slug === activeSlug);
    if (!map || !s || s.lat == null || s.lng == null) return;
    if (!map.getBounds().contains([s.lng, s.lat])) {
      map.easeTo({ center: [s.lng, s.lat], duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug]);

  // MapLibre sets position: relative on its container, which would undo an "absolute inset-0" on the
  // same element and collapse its height. So the sizing lives on a wrapper, and the map gets 100% of it.
  return (
    <div className="absolute inset-0">
      <div ref={box} className="h-full w-full" />
      {!skeletonGone && (
        <MapSkeleton
          className={`z-10 transition-opacity duration-300 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
        />
      )}
      {studios.map((st) => {
        const h = hosts.get(st.slug);
        if (!h || st.slug !== activeSlug) return null;
        return createPortal(<PopupCard studio={st} below={h.below} onClose={() => onSelect(null)} />, h.host, st.slug);
      })}
    </div>
  );
}
