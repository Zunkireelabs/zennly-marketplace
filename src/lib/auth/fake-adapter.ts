import { z } from "zod";
import type { AuthAdapter, AuthResult, AuthUser, CodeTarget } from "./types";

/**
 * FAKE AUTH ADAPTER. DEMO ONLY, NOT SECURE.
 *
 * It accepts a fixed test code and keeps the "session" in localStorage, which the visitor fully
 * controls. Nothing server-side may ever trust it, and it must never ship to production:
 * `index.ts` only picks it when `NODE_ENV !== "production"`. This module has no top-level side
 * effects so the bundler can drop it from production builds.
 */

const TEST_CODE = "000000";
const SESSION_KEY = "zennly:fake-session:v1";
const CODE_TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

const SessionSchema = z.object({
  id: z.string().min(1).max(64),
  phone: z.string().max(20).optional(),
  email: z.string().max(254).optional(),
  name: z.string().max(80).optional(),
  phoneVerified: z.boolean(),
  emailVerified: z.boolean(),
});

type Challenge = { sentAt: number; expiresAt: number; attempts: number; lockedUntil: number };

/** Stable non-cryptographic id so the same identifier maps to the same fake user. */
function fakeId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fake_${(h >>> 0).toString(36)}`;
}

function fail<T = never>(error: Extract<AuthResult<T>, { ok: false }>["error"]): AuthResult<T> {
  return { ok: false, error };
}

export function createFakeAdapter(): AuthAdapter {
  const listeners = new Set<() => void>();
  const challenges = new Map<string, Challenge>();
  let cachedRaw: string | null = null;
  let cachedUser: AuthUser | null = null;

  const emit = () => listeners.forEach((l) => l());

  const readSession = (): AuthUser | null => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
    // Keep the same object while storage is unchanged (required by useSyncExternalStore).
    if (raw === cachedRaw) return cachedUser;
    cachedRaw = raw;
    if (!raw) return (cachedUser = null);
    try {
      const parsed = SessionSchema.safeParse(JSON.parse(raw));
      return (cachedUser = parsed.success ? parsed.data : null);
    } catch {
      return (cachedUser = null);
    }
  };

  const writeSession = (user: AuthUser | null) => {
    try {
      if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage unavailable (private mode, blocked): fall back to memory for this tab only.
      cachedRaw = user ? JSON.stringify(user) : null;
      cachedUser = user;
    }
    emit();
  };

  const key = (t: CodeTarget) => `${t.kind}:${t.value}`;

  const sendCode = (target: CodeTarget): AuthResult<CodeTarget> => {
    const now = Date.now();
    const existing = challenges.get(key(target));
    if (existing && existing.lockedUntil > now) {
      return fail({
        code: "locked",
        message: "Too many wrong codes. Try again in a minute.",
        retryAfterMs: existing.lockedUntil - now,
      });
    }
    if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
      return fail({
        code: "cooldown",
        message: "Please wait a moment before asking for another code.",
        retryAfterMs: RESEND_COOLDOWN_MS - (now - existing.sentAt),
      });
    }
    challenges.set(key(target), {
      sentAt: now,
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      lockedUntil: 0,
    });
    return { ok: true, data: target };
  };

  const listener = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) emit();
  };

  return {
    name: "fake",
    demoHint: `Demo mode: no code is sent. Enter ${TEST_CODE}.`,

    async signInWithPhone(phone) {
      return sendCode({ kind: "phone", value: phone });
    },

    async signInWithEmail(email) {
      return sendCode({ kind: "email", value: email });
    },

    async verifyCode(target, code) {
      const now = Date.now();
      const challenge = challenges.get(key(target));
      if (!challenge) {
        return fail({ code: "no_challenge", message: "Request a new code first." });
      }
      if (challenge.lockedUntil > now) {
        return fail({
          code: "locked",
          message: "Too many wrong codes. Try again in a minute.",
          retryAfterMs: challenge.lockedUntil - now,
        });
      }
      if (now > challenge.expiresAt) {
        challenges.delete(key(target));
        return fail({ code: "expired", message: "That code has expired. Request a new one." });
      }
      if (code !== TEST_CODE) {
        challenge.attempts += 1;
        if (challenge.attempts >= MAX_ATTEMPTS) {
          challenge.lockedUntil = now + LOCK_MS;
          challenge.attempts = 0;
          return fail({
            code: "locked",
            message: "Too many wrong codes. Try again in a minute.",
            retryAfterMs: LOCK_MS,
          });
        }
        return fail({
          code: "invalid_code",
          message: "That code isn't right.",
          attemptsLeft: MAX_ATTEMPTS - challenge.attempts,
        });
      }
      challenges.delete(key(target));
      const user: AuthUser =
        target.kind === "phone"
          ? { id: fakeId(key(target)), phone: target.value, phoneVerified: true, emailVerified: false }
          : { id: fakeId(key(target)), email: target.value, phoneVerified: false, emailVerified: true };
      writeSession(user);
      return { ok: true, data: user };
    },

    async signInWithGoogle() {
      // Stub: there is no OAuth round trip, no token, nothing leaves the browser.
      const user: AuthUser = {
        id: fakeId("google:demo"),
        email: "demo.google@example.test",
        name: "Demo Google User",
        phoneVerified: false,
        emailVerified: true,
      };
      writeSession(user);
      return { ok: true, data: user };
    },

    async signOut() {
      writeSession(null);
    },

    getUser() {
      if (typeof window === "undefined") return null;
      return readSession();
    },

    onChange(cb) {
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.addEventListener("storage", listener);
      }
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", listener);
        }
      };
    },
  };
}
