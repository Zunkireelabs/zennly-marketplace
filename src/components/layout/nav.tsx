"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Destination, SearchIndex } from "@/lib/home-rails";
import { SearchBar } from "@/components/search/search-bar";
import { useAuth } from "@/lib/auth/auth-provider";
import { maskTarget } from "@/lib/auth/normalize";
import { MARKETING_SITE_HOME } from "@/lib/marketing-links";
import { CurrencyChip, CurrencyRow } from "./currency-picker";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

const MENU_LINKS = [
  { label: "Discover", href: "#" },
  { label: "Collections", href: "#" },
  { label: "Saved", href: "/saved" },
];

/**
 * `overlay` floats transparent with white text over the homepage hero. `solid` sits in normal
 * flow with dark text, for pages that start on the light page background.
 */
export function Nav({
  variant = "overlay",
  search,
}: {
  variant?: "overlay" | "solid";
  /** Shows the shared search bar inside the nav row — inner pages only. Needs the search data. */
  search?: { destinations: Destination[]; searchIndex: SearchIndex };
}) {
  const solid = variant === "solid";
  const providersHref = MARKETING_SITE_HOME;
  const ink = solid ? "text-foreground" : "text-white";
  const edge = solid ? "border-foreground/25 hover:border-foreground" : "border-white/40 hover:border-white";
  const bar = solid ? "bg-foreground" : "bg-white";
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, ready, openLogin, signOut } = useAuth();
  const reduceMotion = useReducedMotion();

  return (
    // Absolute + transparent — floats over the hero video instead of sitting in normal
    // document flow, so the footage shows through behind it. Text/borders are light (white)
    // for legibility against the photo; the hero's own top scrim (see hero.tsx) exists
    // specifically to keep this readable.
    <header
      className={
        solid
          ? "relative z-30 border-b border-border bg-background"
          : "absolute inset-x-0 top-0 z-30 bg-transparent"
      }
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" onClick={() => setMenuOpen(false)}>
          <Image
            src="/images/brand/zennly-logo.png"
            alt="Zennly"
            width={467}
            height={157}
            priority
            // Overlay sits on the dark hero, where the green logo disappears — flatten it to white.
            className={`h-7 w-auto ${solid ? "" : "brightness-0 invert"}`}
          />
        </Link>

        {search && <SearchBar variant="nav" destinations={search.destinations} searchIndex={search.searchIndex} />}

        <div className="flex items-center gap-3">
          <AccountControl ink={ink} solid={solid} />
          <CurrencyChip ink={ink} edge={edge} />
          <Link
            href={providersHref}
            className={`hidden rounded-[var(--radius-full)] border px-4 py-2 font-mono text-sm font-medium transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:inline-block ${ink} ${edge}`}
          >
            For Businesses
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="nav-menu-panel"
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex items-center gap-2 rounded-[var(--radius-full)] border px-4 py-2 text-sm font-medium transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${ink} ${edge}`}
          >
            Menu
            <span className="flex flex-col gap-[3px]">
              <span
                className={`h-[1.5px] w-4 ${bar} transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  menuOpen ? "translate-y-[4.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-[1.5px] w-4 ${bar} transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  menuOpen ? "-translate-y-[4.5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="nav-menu-panel"
              role="menu"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: EASE_STANDARD }}
              className="absolute right-6 top-[calc(100%+8px)] flex w-56 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card p-2 shadow-[var(--shadow-modal)]"
            >
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted"
                  role="menuitem"
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-1 h-px bg-border" />
              <CurrencyRow />
              <div className="my-1 h-px bg-border sm:hidden" />

              <Link
                href={providersHref}
                onClick={() => setMenuOpen(false)}
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted sm:hidden"
                role="menuitem"
              >
                For Businesses
              </Link>
              {ready && !user && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openLogin();
                  }}
                  className="rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted sm:hidden"
                  role="menuitem"
                >
                  Log in
                </button>
              )}
              {ready && user && (
                <div className="flex flex-col gap-1 sm:hidden">
                  <p className="truncate px-3 pt-1 text-xs text-muted-foreground">{accountLabel(user)}</p>
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted"
                  >
                    Log out
                  </button>
                </div>
              )}

              <Link
                href="/collections/restore-and-retreat"
                onClick={() => setMenuOpen(false)}
                className="mt-1 rounded-[var(--radius-sm)] bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-hover"
                role="menuitem"
              >
                Explore studios
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

type NavUser = NonNullable<ReturnType<typeof useAuth>["user"]>;

function accountLabel(user: NavUser): string {
  if (user.name) return user.name;
  if (user.email) return maskTarget("email", user.email);
  if (user.phone) return maskTarget("phone", user.phone);
  return "Your account";
}

/** "Log in" when signed out; an account menu when signed in. Desktop only (mobile uses the Menu). */
function AccountControl({ ink, solid }: { ink: string; solid: boolean }) {
  const { user, ready, openLogin, signOut } = useAuth();
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

  // Reserve the space until the session is known, so the row does not jump.
  if (!ready) return <span aria-hidden className="hidden h-5 w-12 sm:inline-block" />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openLogin()}
        className={`hidden text-sm font-medium ${ink} sm:inline-block`}
      >
        Log in
      </button>
    );
  }

  const initial = (user.name ?? user.email ?? user.phone ?? "?").replace(/^\+/, "").charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className={`relative flex size-9 items-center justify-center overflow-hidden rounded-[var(--radius-full)] text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          solid ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "bg-white text-foreground hover:bg-white/85"
        }`}
      >
        {user.avatar ? <Image src={user.avatar} alt="" fill sizes="36px" className="object-cover" /> : initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] flex w-60 flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card p-2 text-foreground shadow-[var(--shadow-modal)]"
        >
          <p className="truncate px-3 pb-1 pt-1 text-xs text-muted-foreground">{accountLabel(user)}</p>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted"
          >
            Profile
          </Link>
          <Link
            href="/saved"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted"
          >
            Saved
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
