import "server-only";

/**
 * Is this studio live for online booking? bookX is the only one who knows (a studio goes live
 * when bookX flips it), so the marketplace asks, never stores the answer.
 *
 *   live       booking pages work as today
 *   not_live   bookX knows the studio but it isn't switched on: no booking pages
 *   not_found  no bookX link at all: a demo listing, no booking pages
 *   error      we couldn't find out: no booking pages, said honestly ("right now")
 *
 * Server-only: the shared secret never reaches a browser. Answers are kept for a short time so a
 * busy studio page doesn't hit bookX on every view; a failed check is kept even shorter so the
 * page recovers quickly once bookX is back.
 */

export type StudioStatusKind = "live" | "not_live" | "not_found" | "error";
export type StudioStatus = { status: StudioStatusKind; phone: string | null };

const OK_TTL_MS = 60_000;
const ERROR_TTL_MS = 10_000;
const TIMEOUT_MS = 4_000;
const MAX_CACHED = 200;

const cache = new Map<string, { at: number; ttl: number; value: StudioStatus }>();

/** For tests only. */
export function resetStudioStatusCache() {
  cache.clear();
}

const FAILED: StudioStatus = { status: "error", phone: null };

async function ask(orgSlug: string): Promise<StudioStatus> {
  const functionsUrl = process.env.BOOK_SPA_FUNCTIONS_URL;
  const secret = process.env.BOOK_SPA_MARKETPLACE_SECRET;
  if (!functionsUrl || !secret) return FAILED;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${functionsUrl}/marketplace-customer-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ action: "status", org_slug: orgSlug }),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return FAILED;
    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object") return FAILED;
    const { status, phone } = json as { status?: unknown; phone?: unknown };
    if (status !== "live" && status !== "not_live" && status !== "not_found") return FAILED;
    return { status, phone: typeof phone === "string" && phone.trim() ? phone.trim() : null };
  } catch {
    return FAILED;
  }
}

export async function getStudioStatus(orgSlug: string): Promise<StudioStatus> {
  const hit = cache.get(orgSlug);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  const value = await ask(orgSlug);
  if (cache.size >= MAX_CACHED) cache.clear();
  cache.set(orgSlug, { at: Date.now(), ttl: value.status === "error" ? ERROR_TTL_MS : OK_TTL_MS, value });
  return value;
}

/** A studio with no bookX link has nothing to ask: it is a demo. */
export async function getProviderBookingStatus(engineProviderId: string | null | undefined): Promise<StudioStatus> {
  if (!engineProviderId) return { status: "not_found", phone: null };
  return getStudioStatus(engineProviderId);
}

/** Booking pages and the create API work only for a live studio. */
export function isBookable(s: StudioStatus): boolean {
  return s.status === "live";
}
