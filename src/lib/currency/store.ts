import { DEFAULT_CURRENCY, isCurrency, type CurrencyCode } from "./currencies";

/** The visitor's chosen display currency, kept on the device. Read back values are validated. */
const STORAGE_KEY = "zennly:currency:v1";
const listeners = new Set<() => void>();
let current: CurrencyCode | null = null;

function read(): CurrencyCode {
  if (current) return current;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    current = isCurrency(raw) ? raw : DEFAULT_CURRENCY;
  } catch {
    current = DEFAULT_CURRENCY;
  }
  return current;
}

export const currencyStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      current = null;
      cb();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: (): CurrencyCode => DEFAULT_CURRENCY,
  set(code: CurrencyCode) {
    current = code;
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage unavailable: the choice holds for this tab only.
    }
    listeners.forEach((l) => l());
  },
};
