"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { useAuth } from "@/lib/auth/auth-provider";
import { auth } from "@/lib/auth";
import { setSavedRemote } from "./remote";
import { savedStore } from "./store";

/** All saved entries, newest first. Empty on the server and during hydration. */
export function useSavedEntries() {
  return useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
}

/**
 * Save state and toggle for one studio. Saving never requires login; the first save while signed
 * out shows a sign-in nudge, which the visitor can ignore.
 */
export function useSaved(slug: string, name: string) {
  const entries = useSavedEntries();
  const { user, openLogin } = useAuth();
  const router = useRouter();
  const saved = entries.some((e) => e.slug === slug);

  const toggle = useCallback(() => {
    const next = savedStore.toggle(slug);
    if (next === null) return;
    if (user && auth.name === "supabase") void setSavedRemote(slug, next);
    track(next ? "studio_saved" : "studio_unsaved", { slug });
    if (!next) {
      toast(`Removed ${name} from saved`);
      return;
    }
    toast(`Saved ${name}`, {
      description: user ? undefined : "Log in to keep your saved studios across devices.",
      action: user
        ? { label: "View saved", onClick: () => router.push("/saved") }
        : { label: "Log in", onClick: () => openLogin("save") },
    });
  }, [slug, name, user, openLogin, router]);

  return { saved, toggle };
}
