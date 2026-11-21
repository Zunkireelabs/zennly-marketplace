/** The small status chip on account cards. The text is already sentence case: never restyle it with `capitalize`. */
export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-[var(--radius-full)] bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}
