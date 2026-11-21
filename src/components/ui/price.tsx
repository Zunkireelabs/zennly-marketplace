"use client";

import { useCurrency } from "@/lib/currency/use-currency";

/**
 * A price in NPR.
 *
 * This used to branch: engine-connected studios' amounts were already real NPR and printed
 * directly, while seed providers held USD needing conversion. The seed data is now NPR and the
 * rate is 1, so both paths produce the same string and the branch is gone.
 *
 * `engineProviderId` is still accepted — deliberately unread — so the ~15 call sites don't churn
 * and the distinction is cheap to reinstate if the two sources ever diverge again.
 */
export function Price({ amount }: { amount: number; engineProviderId?: string }) {
  const { format } = useCurrency();
  return <>{format(amount)}</>;
}
