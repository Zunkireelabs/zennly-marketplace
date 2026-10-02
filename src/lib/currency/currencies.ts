/**
 * Prices are stored in USD and converted only when shown. Rates are fixed placeholders until a live
 * feed replaces them; this file is the one place to change that.
 */
export const CURRENCIES = {
  USD: { symbol: "$", rate: 1, locale: "en-US", label: "US dollar", priceStep: 5 },
  NPR: { symbol: "Rs ", rate: 133, locale: "en-IN", label: "Nepali rupee", priceStep: 500 },
  INR: { symbol: "₹", rate: 84, locale: "en-IN", label: "Indian rupee", priceStep: 500 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === "string" && Object.hasOwn(CURRENCIES, v);
}

/** A USD amount in `code`, rounded to a whole unit. */
export function convert(usd: number, code: CurrencyCode): number {
  return Math.round(usd * CURRENCIES[code].rate);
}

export function formatMoney(usd: number, code: CurrencyCode): string {
  const c = CURRENCIES[code];
  return `${c.symbol}${convert(usd, code).toLocaleString(c.locale)}`;
}
