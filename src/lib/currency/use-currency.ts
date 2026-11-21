"use client";

import { useCallback, useSyncExternalStore } from "react";
import { convert, formatMoney, type CurrencyCode } from "./currencies";
import { currencyStore } from "./store";

/**
 * The display currency, plus helpers that turn USD amounts into it.
 *
 * There is no setter: the currency picker was removed and the currency is fixed to NPR. Amounts
 * from engine-connected studios are already real NPR and must NOT pass through here — see
 * `Price` in components/ui/price.tsx, which renders those directly.
 */
export function useCurrency() {
  const currency: CurrencyCode = useSyncExternalStore(
    currencyStore.subscribe,
    currencyStore.getSnapshot,
    currencyStore.getServerSnapshot,
  );
  const format = useCallback((amount: number) => formatMoney(amount, currency), [currency]);
  const toDisplay = useCallback((amount: number) => convert(amount, currency), [currency]);
  return { currency, format, toDisplay };
}
