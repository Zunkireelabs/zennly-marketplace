"use client";

import { useCurrency } from "@/lib/currency/use-currency";

/** A USD amount shown in the visitor's chosen currency. */
export function Price({ usd }: { usd: number }) {
  const { format } = useCurrency();
  return <>{format(usd)}</>;
}
