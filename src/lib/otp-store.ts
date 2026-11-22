import "server-only";
import crypto from "crypto";

/**
 * Ported from otp-service/server.js (docs/marketing/retired-deploy-config/otp-service), the
 * standalone container that used to sit behind nginx at /api/otp/* before the marketing site
 * and this app merged. Deliberately stateless in the sense that matters: the code itself is
 * never stored. /send returns a signed token (expiry + HMAC of email|expiry|code); /verify
 * recomputes the HMAC and compares. What IS kept in memory is per-process rate-limit and
 * one-time-use bookkeeping — exactly what server.js kept, same shape, same single-process
 * assumption (this app runs as one Node process per container, same as otp-service did).
 */

const TTL_MS = 10 * 60 * 1000;
const SECRET = process.env.OTP_SECRET || (process.env.NODE_ENV === "production" ? "" : crypto.randomBytes(32).toString("hex"));

const hits = new Map<string, number[]>();
const attempts = new Map<string, { n: number; exp: number }>();
const used = new Map<string, number>();

// Same sweep cadence as server.js. `global` guard so Next's dev-mode module reloads don't stack
// multiple intervals on top of each other.
const globalForOtp = global as unknown as { __otpSweepStarted?: boolean };
if (!globalForOtp.__otpSweepStarted) {
  globalForOtp.__otpSweepStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, list] of hits) {
      const fresh = list.filter((t) => now - t < 3600e3);
      if (fresh.length) hits.set(k, fresh);
      else hits.delete(k);
    }
    for (const [t, exp] of used) if (exp < now) used.delete(t);
    for (const [t, a] of attempts) if (a.exp < now) attempts.delete(t);
  }, 60e3).unref();
}

export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

export function sign(email: string, exp: number, code: string): string {
  if (!SECRET) throw new Error("OTP_SECRET is required");
  return crypto.createHmac("sha256", SECRET).update(`${email}|${exp}|${code}`).digest("hex");
}

export function safeEq(a: string, b: string): boolean {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function makeToken(email: string, exp: number, code: string): string {
  return `${exp}.${sign(email, exp, code)}`;
}

export function parseToken(token: string): { exp: number; mac: string } | null {
  const [expStr, mac] = token.split(".");
  const exp = Number(expStr);
  if (!mac || !Number.isFinite(exp)) return null;
  return { exp, mac };
}

export function isUsed(token: string): boolean {
  return used.has(token);
}

export function markUsed(token: string, exp: number): void {
  used.set(token, exp);
}

export function attemptCount(token: string): number {
  return attempts.get(token)?.n ?? 0;
}

export function recordFailedAttempt(token: string, exp: number): void {
  attempts.set(token, { n: attemptCount(token) + 1, exp });
}

export const OTP_TTL_MS = TTL_MS;
export const OTP_SECRET_CONFIGURED = Boolean(SECRET);
