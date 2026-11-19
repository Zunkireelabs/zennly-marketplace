"use client";

import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { profileCompleteness } from "@/lib/account/completeness";

const DISMISS_KEY = "zennly:profile-prompt-dismissed:v1";

// useSyncExternalStore, not useEffect+setState, for the same reason src/lib/currency/store.ts
// reads localStorage this way: it's external (non-React) state, so this is a subscription, not a
// side effect to synchronize — and getServerSnapshot gives SSR a safe default with no hydration
// mismatch, where a useEffect would flash the prompt open for a frame before reading storage.
function subscribeDismissed() {
  return () => {};
}
function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A dismissible nudge toward finishing the profile — never a gate. Nothing here blocks anything;
 * it just disappears once dismissed (localStorage, this device) or once the profile is complete.
 * See src/lib/account/completeness.ts's header comment for why this must stay this way.
 */
export function CompletenessPrompt() {
  const { user } = useAuth();
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => false);
  const [dismissedNow, setDismissedNow] = useState(false);

  if (!user) return null;
  const { missing, percent } = profileCompleteness(user);
  if (missing.length === 0 || dismissed || dismissedNow) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable (private browsing, quota) — still hide it for this render via
      // dismissedNow below; it just won't stay hidden across a reload.
    }
    setDismissedNow(true);
  };

  return (
    <div className="mt-6 flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm">
      <p className="text-foreground">
        Your profile is {percent}% complete. Finishing it fills in bookings automatically — no typing your details every time.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  );
}
