/**
 * Keeps a customer's booking choices across a login that leaves the page (Google sign-in
 * redirects away and back). Saved just before login starts, read once on return, then dropped.
 *
 * Stored in sessionStorage only (this tab, gone when it closes), holds no personal details, only
 * which studio/branch/service/day/time they had picked, and expires after 30 minutes. Every
 * storage call is wrapped: private windows and blocked storage must never break booking.
 */
const KEY = "zennly-booking-resume";
export const RESUME_TTL_MS = 30 * 60 * 1000;

export type ResumeState = {
  slug: string;
  branchId: string | null;
  serviceId: string;
  date: string; // YYYY-MM-DD
  minutes: number; // slot start, minutes from midnight
  savedAt: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function saveResume(
  state: Omit<ResumeState, "savedAt">,
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage()
): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ ...state, savedAt: now }));
  } catch {
    // storage full or blocked: booking still works, the choices just won't survive a redirect
  }
}

export function clearResume(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

/**
 * The saved choices for THIS studio, or null. Anything expired, malformed, from another studio,
 * or from the future is discarded (and removed), never trusted.
 */
export function loadResume(
  slug: string,
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage()
): ResumeState | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearResume(storage);
    return null;
  }
  const p = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const valid =
    typeof p.slug === "string" &&
    (p.branchId === null || typeof p.branchId === "string") &&
    typeof p.serviceId === "string" &&
    p.serviceId.length > 0 &&
    typeof p.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
    typeof p.minutes === "number" &&
    Number.isInteger(p.minutes) &&
    p.minutes >= 0 &&
    p.minutes < 1440 &&
    typeof p.savedAt === "number";
  if (!valid) {
    clearResume(storage);
    return null;
  }
  const state = p as unknown as ResumeState;
  const age = now - state.savedAt;
  if (age < 0 || age > RESUME_TTL_MS) {
    clearResume(storage);
    return null;
  }
  if (state.slug !== slug) return null; // someone else's studio: leave it for that page
  return state;
}

/**
 * Is the saved slot still on offer? `slots` is the drawer's own slot list for the saved day
 * (start minutes + availability), or null when that day isn't in the bookable window.
 */
export function slotStillOffered(
  slots: readonly { minutes: number; available: boolean }[] | null,
  minutes: number
): boolean {
  return Boolean(slots?.some((s) => s.minutes === minutes && s.available));
}
