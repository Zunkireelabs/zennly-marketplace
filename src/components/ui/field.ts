/**
 * The one text-input style for every form on the site, in the same spirit as pillClass: a class
 * helper rather than a wrapper component, so it works on <input>, <select> and <textarea> alike
 * without any of them needing to accept a ref through a component boundary.
 *
 * It exists because there were three hand-copied variants that had already drifted — the login
 * dialog's (h-12 / 14px / text-base), the profile editor's (h-11 / 12px / text-sm), and a third
 * added with the email-change dialog that introduced a hover-border transition the other two
 * didn't have. Copy four would have drifted further. The two genuine sizes are kept because they
 * are a real distinction, not an accident: `lg` suits the login dialog's larger type, `md` suits
 * the denser account forms.
 */
export type FieldOptions = {
  /** "md" for account forms and dense layouts; "lg" for the login dialog's larger type. */
  size?: "md" | "lg";
  /** Code entry: centred, monospaced, wide letter-spacing. For 6-digit one-time codes. */
  code?: boolean;
};

export function fieldClass({ size = "md", code = false }: FieldOptions = {}) {
  const base =
    "w-full border border-border bg-card text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-150 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";
  const dims = size === "lg" ? "h-12 rounded-[14px] px-4 text-base" : "h-11 rounded-[12px] px-3.5 text-sm";
  // Overrides the size's own text treatment on purpose: a code is read digit by digit, so it gets
  // the same presentation at either size.
  const codeLook = code ? "text-center font-mono text-2xl tracking-[0.5em]" : "";
  return `${base} ${dims} ${codeLook}`;
}
