"use client";

import { useAuth } from "@/lib/auth/auth-provider";
import { AccountSidebar } from "./account-nav";

/**
 * The layout-level chrome every /account/* route shares: the signed-out gate, and — once signed
 * in — the desktop sidebar + content grid (collection-browser.tsx:143-258's exact shape, the
 * working precedent already in this codebase, not a new one).
 *
 * Signed out: the same card profile-view.tsx's `!user` branch already renders (duplicated here
 * rather than imported — profile-view.tsx itself isn't being touched as part of this shell work),
 * for EVERY account route, performing no lookup at all. Never a redirect: a studio link might
 * deep-link straight into /account/appointments, and bouncing that to a login page would lose
 * where they were trying to go.
 */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, ready, openLogin } = useAuth();

  if (!ready) {
    return <div aria-hidden className="mx-auto max-w-6xl px-6 py-8" />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Your account</h1>
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">You&rsquo;re not signed in</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Log in to see your bookings and membership across every studio you&rsquo;ve visited.
          </p>
          <button
            type="button"
            onClick={() => openLogin("login")}
            className="mt-5 inline-block rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Account sections">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 [scrollbar-width:thin]">
            <AccountSidebar />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
