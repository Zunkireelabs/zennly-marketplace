"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  failed: "Google sign-in didn't complete. Please try again.",
  unavailable: "Sign in isn't available right now. Please try again later.",
};

/** The Google routes redirect home with `?login=failed|unavailable`; show it once, then clean the URL. */
export function LoginResultToast() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("login");
    if (!result) return;
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    const message = MESSAGES[result];
    if (message) toast.error(message);
  }, []);
  return null;
}
