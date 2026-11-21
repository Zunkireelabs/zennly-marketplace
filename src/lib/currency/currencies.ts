/**
 * Prices are stored in NPR and shown as-is. They used to be stored in USD and converted at a
 * placeholder rate; the seed data was converted to real NPR amounts and the rate is now 1, so
 * nothing is invented at render time.
 *
 * Engine-connected studios were always NPR (book-spa's own prices) and bypassed conversion
 * entirely — see `Price` in components/ui/price.tsx. Both sources now agree, which is why that
 * component no longer needs to tell them apart.
 *
 * Only one currency exists because the picker was removed. USD and INR entries were deleted
 * rather than left with stale rates: against NPR-stored amounts those rates were wrong, and a
 * wrong rate sitting in a map is a trap for whoever re-enables switching. Adding a currency
 * back means giving it a rate FROM NPR.
 */
export const CURRENCIES = {
  NPR: { symbol: "Rs ", rate: 1, locale: "en-IN", label: "Nepali rupee", priceStep: 500 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
export const DEFAULT_CURRENCY: CurrencyCode = "NPR";

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === "string" && Object.hasOwn(CURRENCIES, v);
}

/** An amount in `code`, rounded to a whole unit. */
export function convert(amount: number, code: CurrencyCode): number {
  return Math.round(amount * CURRENCIES[code].rate);
}

export function formatMoney(amount: number, code: CurrencyCode): string {
  const c = CURRENCIES[code];
  return `${c.symbol}${convert(amount, code).toLocaleString(c.locale)}`;
}
