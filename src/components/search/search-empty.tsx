import type { SearchQuery } from "@/lib/search";
import { EmptyCard } from "@/components/ui/empty-card";
import { MARKETING_SITE_HOME } from "@/lib/marketing-links";

/**
 * Nothing to list (ZNLY-348). The search itself lives in the URL (where/what/date/time), so
 * "Clear search" is a link to /search: the server reads the empty params and lists every studio.
 * Filters and the map area live in this component, so they clear here.
 */
export function SearchEmpty({
  query,
  narrowed,
  view,
  onClearFilters,
}: {
  query: Pick<SearchQuery, "where" | "what">;
  narrowed: boolean;
  view: "list" | "map";
  onClearFilters: () => void;
}) {
  const searched = Boolean(query.where || query.what);
  if (searched) {
    const title = `No studios ${[query.what && `for "${query.what}"`, query.where && `in ${query.where}`].filter(Boolean).join(" ")} yet`;
    return (
      <EmptyCard
        title={title}
        action={{ label: "Clear search", href: view === "map" ? "/search?view=map" : "/search" }}
      >
        Try a different treatment or location, or clear your search to see every studio.
      </EmptyCard>
    );
  }
  if (narrowed) {
    return (
      <EmptyCard title="No studios match these filters" action={{ label: "Clear filters", onClick: onClearFilters }}>
        Try removing a filter, or zoom the map out.
      </EmptyCard>
    );
  }
  return (
    <EmptyCard title="New studios are joining Zennly soon" action={{ label: "Own a studio? List it on Zennly", href: MARKETING_SITE_HOME }}>
      We&rsquo;re getting the first studios ready. Check back shortly.
    </EmptyCard>
  );
}
