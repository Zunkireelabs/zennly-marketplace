import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * The one pill style for every clickable chip, tab, filter and secondary action on the site.
 * Change it here and it changes everywhere. Use `pillClass` on anything that isn't a <button>
 * (a Link, an <a> tab); use <Pill> for buttons.
 */
export type PillOptions = {
  /** Filled dark when on (active tab, applied filter, chosen option). */
  selected?: boolean;
  /** "md" for filters, tabs and actions; "sm" for dense rows like date/time options. */
  size?: "md" | "sm";
  /** Lifted on a shadow with no outline, for pills floating over a map or photo. */
  floating?: boolean;
};

export function pillClass({ selected = false, size = "md", floating = false }: PillOptions = {}) {
  const base =
    "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-[var(--radius-full)] border font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";
  const dims = size === "sm" ? "px-3.5 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const look = selected
    ? "border-foreground bg-foreground text-background"
    : floating
      ? "border-transparent bg-card text-foreground shadow-[var(--shadow-floating)] hover:bg-muted"
      : "border-border bg-card text-foreground hover:border-foreground/40";
  return `${base} ${dims} ${look}`;
}

export const Pill = forwardRef<HTMLButtonElement, PillOptions & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Pill({ selected, size, floating, className = "", type = "button", ...rest }, ref) {
    return <button ref={ref} type={type} className={`${pillClass({ selected, size, floating })} ${className}`} {...rest} />;
  }
);
