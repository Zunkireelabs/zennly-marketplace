import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS, supabaseConfig } from "./config";

/** A per-request Supabase client for route handlers and server components. Null if not configured. */
export async function createSupabaseServer() {
  const config = supabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS });
          }
        } catch {
          // Called from a server component, where cookies are read-only. proxy.ts refreshes them.
        }
      },
    },
  });
}
