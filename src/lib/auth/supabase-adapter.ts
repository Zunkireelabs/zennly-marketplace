import type { AuthAdapter, AuthResult, AuthUser, CodeTarget } from "./types";

/**
 * Real adapter (Phase 2). It never touches tokens: the session lives in an httpOnly cookie managed
 * by our own /api/auth routes (see src/lib/supabase), and this file only calls those routes and
 * caches the current user for the UI. Email code and Google only; phone arrives with an SMS provider.
 */

const unavailable = <T = never>(message = "Sign in isn't available right now."): AuthResult<T> => ({
  ok: false,
  error: { code: "unavailable", message },
});

async function post<T>(path: string, body: unknown): Promise<AuthResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const json = (await res.json()) as AuthResult<T>;
    return json && typeof json.ok === "boolean" ? json : unavailable();
  } catch {
    return unavailable("Check your connection and try again.");
  }
}

export function createSupabaseAdapter(): AuthAdapter {
  let user: AuthUser | null = null;
  const listeners = new Set<() => void>();
  const set = (next: AuthUser | null) => {
    user = next;
    listeners.forEach((l) => l());
  };

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json()) as AuthResult<AuthUser | null>;
      set(json.ok ? json.data : null);
    } catch {
      // Offline or server error: stay signed out in the UI; the cookie is untouched.
    }
  };
  if (typeof window !== "undefined") {
    void refresh();
    // Back/forward cache restores a page without re-running scripts; re-check the session then.
    window.addEventListener("pageshow", (e) => e.persisted && void refresh());
  }

  return {
    name: "supabase",
    // UI only for now: the Phone tab shows, but submitting says it isn't available until an SMS
    // provider is set up (see signInWithPhone below).
    supportsPhone: true,
    // REQUIRES the project's Magic Link email template to render {{ .Token }} rather than
    // {{ .ConfirmationURL }} (Supabase dashboard → Authentication → Email Templates). The
    // template is project-level GoTrue config, not data, so it does NOT travel with a database
    // migration — a project restored from backup comes back on the platform default, which
    // sends a link. If sign-in emails start arriving as links again, check there first: this
    // flag would then be asking for a code the email never contains.
    //
    // The default SMTP sender is heavily rate-limited (a handful of emails per hour), so custom
    // SMTP is still needed before this carries real signup volume — but it is not required for
    // codes to work.
    emailMethod: "code",
    refresh,

    signInWithPhone: async () => unavailable("Phone sign in isn't available yet. Use email or Google."),

    signInWithEmail: (email) =>
      post<CodeTarget>("/api/auth/email", { email, next: window.location.pathname + window.location.search }),

    async verifyCode(target, code) {
      if (target.kind !== "email") return unavailable();
      const result = await post<AuthUser>("/api/auth/verify", { email: target.value, code });
      if (result.ok) set(result.data);
      return result;
    },

    // Full-page redirect to Google and back to /auth/callback; the promise never settles because
    // the page is leaving.
    signInWithGoogle() {
      const next = window.location.pathname + window.location.search;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- server route, not a page
      window.location.assign(`/api/auth/google?next=${encodeURIComponent(next)}`);
      return new Promise<never>(() => {});
    },

    async signOut() {
      await post("/api/auth/signout", {});
      set(null);
    },

    getUser: () => user,

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
