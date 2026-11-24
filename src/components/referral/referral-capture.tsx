"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { normalizeCode } from "@/lib/referral/code";

const KEY = "zennly-ref";

function stored(): string | null {
  try {
    return normalizeCode(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

/**
 * Remembers a friend's invite link (`?ref=CODE`) until the visitor signs in, then tells the server
 * once. Renders nothing. Every step is best-effort: a referral must never get in the way of
 * browsing or signing up, so storage being blocked or the call failing is simply ignored.
 */
export function ReferralCapture() {
  const { user, ready } = useAuth();

  // 1. Keep a code that arrives on the URL.
  useEffect(() => {
    try {
      const code = normalizeCode(new URLSearchParams(window.location.search).get("ref"));
      if (code) window.localStorage.setItem(KEY, code);
    } catch {
      /* storage blocked: the link just won't be remembered */
    }
  }, []);

  // 2. Once signed in, hand it to the server and forget it.
  useEffect(() => {
    if (!ready || !user) return;
    const code = stored();
    if (!code) return;
    void fetch("/api/referral/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        // A real answer (claimed, or refused as invalid / own code / too old / already) ends it.
        // "Not signed in yet" (401), a blocked request (403) or a server error (5xx) keeps it for a retry.
        if (res.ok || res.status === 400) window.localStorage.removeItem(KEY);
      })
      .catch(() => {});
  }, [ready, user]);

  return null;
}
