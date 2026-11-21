/**
 * A studio with no reviews has no rating, not a rating of 0. "0.0" tells a customer the studio is
 * rated zero, so every place that shows or sorts by rating goes through here (ZNLY-349).
 * Rail types that carry no review count are judged by the rating alone.
 */
type Rated = { rating?: number | null; reviewCount?: number | null };

export function hasRating(p: Rated): boolean {
  return typeof p.rating === "number" && p.rating > 0 && p.reviewCount !== 0;
}

/** Sort comparator, best first: rated studios by rating (then review count), unrated ones after all rated. */
export function compareByRating(a: Rated, b: Rated): number {
  const ra = hasRating(a);
  const rb = hasRating(b);
  if (ra !== rb) return ra ? -1 : 1;
  if (!ra) return 0;
  return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
}
