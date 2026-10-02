"use client";

import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { CURRENCIES, convert, formatMoney, type CurrencyCode } from "./currencies";
import { currencyStore } from "./store";

/** The display currency, plus helpers that turn USD amounts into it. USD on the server and during hydration. */
export function useCurrency() {
  const currency = useSyncExternalStore(currencyStore.subscribe, currencyStore.getSnapshot, currencyStore.getServerSnapshot);
  const format = useCallback((usd: number) => formatMoney(usd, currency), [currency]);
  const toDisplay = useCallback((usd: number) => convert(usd, currency), [currency]);
  const setCurrency = useCallback(
    (code: CurrencyCode) => {
      if (code === currency) return;
      currencyStore.set(code);
      toast.success(`Currency changed to ${code} · ${CURRENCIES[code].label}`);
    },
    [currency],
  );
  return { currency, setCurrency, format, toDisplay };
}
