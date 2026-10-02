"use client";

import { useEffect, useRef } from "react";
import { auth, type AuthUser } from "@/lib/auth";
import { mergeToAccount } from "./remote";
import { savedStore } from "./store";

/**
 * Keeps saved studios in step with the account. On sign-in the device list is merged into the
 * account and the account's list becomes the device list; on sign-out the device list is cleared.
 * Does nothing with the fake adapter (it has no server).
 */
export function SavedSync({ user }: { user: AuthUser | null }) {
  const lastId = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (auth.name !== "supabase") return;
    const previous = lastId.current;
    lastId.current = userId;

    if (!userId) {
      if (previous) savedStore.clear();
      return;
    }
    let cancelled = false;
    void mergeToAccount(savedStore.getSnapshot()).then((list) => {
      if (!cancelled && list) savedStore.replace(list);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
