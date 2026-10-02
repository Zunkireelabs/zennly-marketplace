import { SiteNav } from "@/components/layout/site-nav";

/** Shown while the server fetches studios for a search. Same layout as the results, so nothing jumps. */
export default function SearchLoading() {
  return (
    <div className="relative flex h-dvh flex-col bg-background">
      <SiteNav />
      <div role="status" aria-label="Loading studios" className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="px-5 pb-2 pt-5 sm:px-7">
            <div className="h-9 w-64 max-w-full rounded-[var(--radius-sm)] bg-muted motion-safe:animate-pulse" />
            <div className="mt-3 h-4 w-48 max-w-full rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="mt-4 flex gap-2">
              {[88, 104, 96, 80].map((w) => (
                <div key={w} className="h-10 rounded-full bg-muted motion-safe:animate-pulse" style={{ width: w }} />
              ))}
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <div className="h-5 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
            </div>
          </div>
          <ul className="grid gap-4 px-5 pt-2 sm:grid-cols-2 sm:px-7 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="rounded-[var(--radius-lg)] border border-border bg-card p-3">
                <div className="aspect-[4/3] rounded-[var(--radius-md)] bg-muted motion-safe:animate-pulse" />
                <div className="mt-4 h-4 w-3/4 rounded-full bg-muted motion-safe:animate-pulse" />
                <div className="mt-2 h-3 w-1/2 rounded-full bg-muted motion-safe:animate-pulse" />
                <div className="mt-4 h-3 w-1/3 rounded-full bg-muted motion-safe:animate-pulse" />
              </li>
            ))}
          </ul>
        </div>
        <span className="sr-only">Loading studios…</span>
      </div>
    </div>
  );
}
