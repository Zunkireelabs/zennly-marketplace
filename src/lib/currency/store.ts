import { DEFAULT_CURRENCY, type CurrencyCode } from "./currencies";

/**
 * The display currency. Fixed to DEFAULT_CURRENCY (NPR) — the picker that let a visitor change
 * it was removed, so a per-device choice no longer exists to read back.
 *
 * Deliberately does NOT read the old `zennly:currency:v1` value: anyone who had once picked USD
 * or INR would be held on that currency forever, with no control left to undo it. The key is
 * left unread rather than cleared — harmless, and it means re-introducing a picker is a change
 * to this file alone.
 */
const listeners = new Set<() => void>();

export const currencyStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot: (): CurrencyCode => DEFAULT_CURRENCY,
  getServerSnapshot: (): CurrencyCode => DEFAULT_CURRENCY,
};
