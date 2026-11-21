/**
 * The ONE price the marketplace shows for a bookable service.
 *
 * book-spa prices some services per staff tier, but the marketplace has no staff picker, so every
 * online booking is made with no staff chosen and book-spa charges the unassigned rate:
 * `effective_price_npr` (public_get_bookable_services). That is the only price a customer can
 * actually get here, so it is the only price we show, everywhere (page list, sidebar select, the
 * drawer rows, "Starting from", the confirm total). The tier min/max in the same response is
 * deliberately ignored: showing "Rs 1,200 – 8,600" would promise prices unreachable without
 * choosing staff. When a staff picker exists, ranges can come back (and this file changes).
 */
export function chargedPrice(row: { effective_price_npr?: unknown; price_npr?: unknown }): number {
  return Number(row.effective_price_npr ?? row.price_npr) || 0;
}

/** Base fields of one public_get_bookable_services row, shared by the page and the drawer. */
export function readBookableService(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name ?? "Service"),
    category: String(row.category_name ?? "Other"),
    durationMinutes: Number(row.duration_minutes) || 60,
    price: chargedPrice(row),
    description: typeof row.description === "string" ? row.description : null,
    isCombo: Boolean(row.is_combo),
  };
}

/** "Starting from": the cheapest charged price on offer, ignoring zero/unpriced rows. 0 if none. */
export function cheapestPrice(prices: readonly number[]): number {
  const priced = prices.filter((p) => p > 0);
  return priced.length > 0 ? Math.min(...priced) : 0;
}
