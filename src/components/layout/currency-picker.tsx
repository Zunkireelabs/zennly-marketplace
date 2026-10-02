"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/currency/currencies";
import { useCurrency } from "@/lib/currency/use-currency";

/** Header chip that opens a short list of currencies. Desktop only; phones use `CurrencyRow` in the Menu. */
export function CurrencyChip({ ink, edge }: { ink: string; edge: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${CURRENCIES[currency].label}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-[var(--radius-full)] border px-4 py-2 font-mono text-sm font-medium transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${ink} ${edge}`}
      >
        {currency}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Currency"
          className="absolute right-0 top-[calc(100%+8px)] flex w-52 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card p-2 text-foreground shadow-[var(--shadow-modal)]"
        >
          {CURRENCY_CODES.map((code) => (
            <li key={code} role="option" aria-selected={code === currency}>
              <button
                type="button"
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted ${
                  code === currency ? "font-semibold" : ""
                }`}
              >
                <span>
                  {code} <span className="text-muted-foreground">· {CURRENCIES[code].label}</span>
                </span>
                {code === currency && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Three small currency buttons, sized to sit inside a filter or panel. */
export function CurrencySwitch() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div role="radiogroup" aria-label="Currency" className="flex gap-1.5">
      {CURRENCY_CODES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={code === currency}
          onClick={() => setCurrency(code)}
          className={`flex-1 rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
            code === currency ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/** Currency choice for the Menu panel, where phones get it. Three small buttons. */
export function CurrencyRow() {
  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-xs text-muted-foreground">Currency</p>
      <CurrencySwitch />
    </div>
  );
}
