import { createAuth } from "./client";
import { createFakeAdapter } from "./fake-adapter";
import { createSupabaseAdapter } from "./supabase-adapter";
import { createUnavailableAdapter } from "./unavailable-adapter";
import type { AuthAdapter } from "./types";

export type { Auth, AuthUser, AuthResult, AuthError, CodeTarget } from "./types";

/**
 * THE one place the active auth backend is chosen. To try another adapter (Supabase in Phase 2),
 * change `pickAdapter` and nothing else.
 *
 * Fail closed: the fake adapter is used only outside production builds, and can be switched off
 * in dev with NEXT_PUBLIC_FAKE_AUTH=off. `NODE_ENV` is inlined at build time, so the fake adapter
 * is dead code (and dropped) in `next build`.
 */
function pickAdapter(): AuthAdapter {
  // Real accounts whenever Supabase is configured (NEXT_PUBLIC_FAKE_AUTH=on forces the fake one in dev).
  const dev = process.env.NODE_ENV !== "production";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !(dev && process.env.NEXT_PUBLIC_FAKE_AUTH === "on")) {
    return createSupabaseAdapter();
  }
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FAKE_AUTH !== "off") {
    return createFakeAdapter();
  }
  return createUnavailableAdapter();
}

export const auth = createAuth(pickAdapter());
