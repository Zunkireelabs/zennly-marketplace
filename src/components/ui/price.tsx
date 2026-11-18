"use client";

import { useCurrency } from "@/lib/currency/use-currency";

/**
 * A USD amount shown in the visitor's chosen currency — EXCEPT for engine-connected providers
 * (`engineProviderId` set), whose service/fromPrice numbers are real NPR amounts from book-spa
 * (src/lib/providers-real.ts), not USD to be converted. Pass `engineProviderId` whenever the
 * amount came from a Provider so this renders correctly either way.
 */
export function Price({ usd, engineProviderId }: { usd: number; engineProviderId?: string }) {
  const { format } = useCurrency();
  if (engineProviderId) return <>Rs {usd.toLocaleString("en-IN")}</>;
  return <>{format(usd)}</>;
}
