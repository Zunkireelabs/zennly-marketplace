"use client";

import { useEffect, useState } from "react";
import { pillClass } from "@/components/ui/pill";

export const SECTION_TABS = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Services" },
  { id: "reviews", label: "Reviews" },
  { id: "amenities", label: "Amenities" },
  { id: "location", label: "Location" },
  { id: "policies", label: "Policies" },
] as const;

/**
 * Sticky anchor tabs with scroll-spy (pattern from stayvista.com's villa page). The active tab
 * follows whichever section crosses the upper third of the viewport.
 */
export function TabBar() {
  const [active, setActive] = useState<string>(SECTION_TABS[0].id);

  useEffect(() => {
    const nodes = SECTION_TABS.map((t) => document.getElementById(t.id)).filter(
      (n): n is HTMLElement => Boolean(n)
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  const jump = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    const node = document.getElementById(id);
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-20 mt-2 border-b border-border bg-background/95 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTION_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} className="shrink-0">
              {/* Hover chip + underline preview + press feedback so the tabs read as clickable. */}
              <a
                href={`#${tab.id}`}
                onClick={(e) => jump(e, tab.id)}
                aria-current={isActive ? "true" : undefined}
                className={`my-3 ${pillClass({ selected: isActive })}`}
              >
                {tab.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
