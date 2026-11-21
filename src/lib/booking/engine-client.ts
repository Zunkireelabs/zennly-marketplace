"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only client against book-spa's own Supabase project — anon key only, never
 * service_role. Deliberately isolated from src/lib/supabase/ (the marketplace's own project):
 * different project, different keys, used only for book-spa's public_* RPCs and the handful of
 * anon-readable tables its own unauthenticated customer booking flow already relies on
 * (organizations, branches, rooms, manual_blocks). Never used for writes — there is no
 * create-booking path yet (docs/booking-migration-plan.md, Phase 1).
 */
let cached: SupabaseClient | null = null;

export function engineConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_BOOK_SPA_ENGINE_URL;
  const key = process.env.NEXT_PUBLIC_BOOK_SPA_ENGINE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function getEngineClient(): SupabaseClient | null {
  const config = engineConfig();
  if (!config) return null;
  if (!cached) {
    cached = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
