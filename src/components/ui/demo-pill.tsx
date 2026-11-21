/** Marks a made-up listing (no bookX link). Only ever rendered when NEXT_PUBLIC_SHOW_DEMO_STUDIOS is on. */
export function DemoPill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[var(--radius-full)] border border-warning-border bg-warning-soft px-2.5 py-0.5 font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-warning-foreground ${className}`}
    >
      Demo
    </span>
  );
}
