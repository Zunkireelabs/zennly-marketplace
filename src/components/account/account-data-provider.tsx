"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LookupResult } from "@/lib/account/studio-lookup";

export type ConnectedStudio = { slug: string; name: string; city: string; image: string };

type AccountData = {
  connectedStudios: ConnectedStudio[];
  /** null until ensureLoaded() has been called and resolved at least once. */
  results: Record<string, LookupResult> | null;
  loading: boolean;
  /** Every connected studio came back reachable:false — the outage state. reachable:true with
   * found:false is a genuine "no visits here yet" and must render differently from this. */
  unreachable: boolean;
  /** Fires the one shared fan-out POST to /api/account/studio-history, the first time ANY
   * section actually needs it. Calling it again once loaded (or while already loading) is a
   * no-op — see the module doc comment below for why that has to hold even under React
   * StrictMode's double-invoke. */
  ensureLoaded: () => void;
};

const Ctx = createContext<AccountData | null>(null);

/**
 * Lives at the account layout level, so it survives navigation between /account/* routes instead
 * of being recreated per page — that's the entire point of the shared-fetch shape: Appointments
 * and Memberships both read from the SAME fetch rather than each repeating the cross-network
 * fan-out to book-spa on every visit.
 *
 * `results` starts null and the fetch is NEVER triggered here, on mount, or anywhere in this
 * provider automatically — only `ensureLoaded()` triggers it, and only a page that actually needs
 * booking/membership data (Appointments, Memberships) calls that, via `useStudioHistory()` below.
 * Profile and Settings never call it, so visiting only those pages makes zero requests to
 * book-spa — not because they're special-cased, but because nothing in them asks.
 *
 * Idempotency is load-bearing, not a nicety: `ensureLoaded` is guarded by an `inFlight` REF
 * (checked and set synchronously, before any state update) rather than by `loading`/`results`
 * state alone — two sections mounting near-simultaneously (or React StrictMode's dev-only
 * double-invoke of effects) can call `ensureLoaded()` twice before a state update from the first
 * call has actually re-rendered anything, and a ref is the one thing guaranteed to already reflect
 * "a call is in flight" at that point.
 */
export function AccountDataProvider({
  connectedStudios,
  children,
}: {
  connectedStudios: ConnectedStudio[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [results, setResults] = useState<Record<string, LookupResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  // Reset when the signed-in user id changes (including to/from signed-out). The provider
  // deliberately outlives navigation within /account/*, which means it would otherwise also
  // outlive a sign-out followed by a different person signing in without a full page reload —
  // leaving the first person's booking history sitting in context for the second to see.
  //
  // The results/loading reset is done during render (React's own documented pattern for
  // "adjusting state when a prop changes" — https://react.dev/learn/you-might-not-need-an-effect),
  // not in a useEffect: an effect would mean one extra render showing the stale data before the
  // reset lands, and calling setState unconditionally inside an effect is also what the
  // react-hooks/set-state-in-effect rule flags. Comparing against a ref tracked across renders
  // and resetting inline, before this render commits, avoids both. `inFlight`/`activeUserId`
  // (used by ensureLoaded below to discard a response that arrives after the user already
  // changed) are refs, and React disallows writing a ref during render — those are reset in the
  // effect right after instead, which still runs before any new render's own effects can call
  // ensureLoaded again.
  const lastUserId = useRef(userId);
  if (lastUserId.current !== userId) {
    lastUserId.current = userId;
    if (results !== null) setResults(null);
    if (loading) setLoading(false);
  }

  const activeUserId = useRef(userId);
  useEffect(() => {
    activeUserId.current = userId;
    inFlight.current = false;
  }, [userId]);

  const ensureLoaded = useCallback(() => {
    if (results !== null || inFlight.current) return;
    if (connectedStudios.length === 0) {
      setResults({});
      return;
    }
    const forUserId = userId;
    inFlight.current = true;
    setLoading(true);
    fetch("/api/account/studio-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerSlugs: connectedStudios.map((s) => s.slug) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        // The signed-in user changed while this was in flight — the result belongs to whoever
        // we asked on behalf of, not whoever's signed in now. Discard rather than let a stale
        // response land in the new user's context.
        if (activeUserId.current !== forUserId) return;
        setResults(json?.ok && json.data ? json.data : {});
      })
      .catch(() => {
        // Fail soft, same rule as the route itself: leave sections to render their own
        // per-studio "unreachable" state from an empty results map rather than surfacing an
        // error here.
        if (activeUserId.current === forUserId) setResults({});
      })
      .finally(() => {
        if (activeUserId.current === forUserId) {
          setLoading(false);
          inFlight.current = false;
        }
      });
  }, [results, connectedStudios, userId]);

  // A MISSING entry counts as unreachable, not as "nothing found" — that distinction is the
  // whole point of this flag and it is easy to lose here. The catch and the !res.ok paths above
  // both fall back to `{}`, so when OUR route fails (as opposed to book-spa failing behind it)
  // every slug is simply absent. Requiring `results[s.slug]` to exist before considering it
  // unreachable would make a total failure of our own endpoint render as a calm "no visits yet" —
  // reintroducing, one layer up, exactly the conflation `reachable` was added to kill.
  const unreachable =
    results !== null &&
    connectedStudios.length > 0 &&
    connectedStudios.every((s) => !results[s.slug]?.reachable);

  const value = useMemo<AccountData>(
    () => ({ connectedStudios, results, loading, unreachable, ensureLoaded }),
    [connectedStudios, results, loading, unreachable, ensureLoaded]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccountData(): AccountData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccountData must be used inside AccountDataProvider");
  return ctx;
}

/**
 * For a section that actually renders booking/membership/package/voucher data — triggers the
 * shared fetch on first use (idempotent, see AccountDataProvider's doc comment) and hands back
 * the current state. A page that never calls this (Profile, Settings) never triggers anything.
 *
 * The trigger has to be an effect, not a direct call in the render body: `ensureLoaded` updates
 * state owned by a DIFFERENT component (the provider), and React disallows updating one
 * component's state synchronously during another component's render. `ctx.ensureLoaded` itself
 * (a function reference, not a literal `setX(...)` call) is what's in the effect body, not a
 * setState call the react-hooks/set-state-in-effect rule would recognize and flag.
 */
export function useStudioHistory(): AccountData {
  const ctx = useAccountData();
  // Deliberately fires once on mount, not on every identity change of ctx/ensureLoaded (both
  // change identity on every loading/results transition) — ensureLoaded's own guards make a
  // repeat call harmless, but keying on mount-only avoids re-invoking it on every state change
  // for no reason.
  useEffect(() => {
    ctx.ensureLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ctx;
}
