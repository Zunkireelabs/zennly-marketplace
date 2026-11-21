"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivityIcon, ChevronLeftIcon, ChevronRightIcon, GearIcon, HeartIcon, TicketIcon, UserIcon } from "@/components/provider/icons";

const SECTIONS = [
  { href: "/account/profile", label: "Profile", Icon: UserIcon },
  { href: "/account/appointments", label: "Appointments", Icon: ActivityIcon },
  { href: "/account/memberships", label: "Memberships & packages", Icon: TicketIcon },
  { href: "/account/favourites", label: "Favourites", Icon: HeartIcon },
  { href: "/account/settings", label: "Settings", Icon: GearIcon },
] as const;

/** Desktop: a sticky sidebar, same grid shape as collection-browser.tsx's filters column. */
export function AccountSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {SECTIONS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
              active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
            }`}
          >
            <Icon width={18} height={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile only: the way back out of a section. The sidebar is `hidden lg:block`, so on a phone a
 * customer who taps into /account/profile has no in-page route back to the section list — only
 * the browser's back gesture, which is not navigation a product should rely on. Rendered on
 * sub-pages only; /account itself IS the list.
 */
export function AccountBackLink() {
  const pathname = usePathname();
  if (pathname === "/account") return null;
  return (
    <Link
      href="/account"
      className="mb-4 -ml-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground lg:hidden"
    >
      <ChevronLeftIcon width={16} height={16} />
      Account
    </Link>
  );
}

/** Mobile /account root: a tapped list of rows, each its own page — not a sheet or filter. */
export function AccountMobileMenu() {
  return (
    <nav aria-label="Account" className="flex flex-col divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-card">
      {SECTIONS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-foreground">
          <Icon width={18} height={18} className="shrink-0 text-muted-foreground" />
          <span className="flex-1">{label}</span>
          <ChevronRightIcon width={18} height={18} className="shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </nav>
  );
}
