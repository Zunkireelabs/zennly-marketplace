import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The one designed "nothing here" card: same dashed look as the empty states in /account. Used
 * where a filter or a search finds no studios (ZNLY-348). Give it a button (onClick) or a link
 * (href), never both.
 */
export function EmptyCard({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}) {
  const btn =
    "mt-5 inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
  return (
    <div className={`rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-12 text-center sm:py-14 ${className}`}>
      <p className="text-lg font-semibold sm:text-xl">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-normal text-muted-foreground">{children}</p>}
      {action?.href && (
        <Link href={action.href} className={btn}>
          {action.label}
        </Link>
      )}
      {action?.onClick && (
        <button type="button" onClick={action.onClick} className={btn}>
          {action.label}
        </button>
      )}
    </div>
  );
}
