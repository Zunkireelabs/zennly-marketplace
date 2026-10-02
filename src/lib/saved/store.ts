import { z } from "zod";

/**
 * Saved studios, stored on the device and keyed by provider slug. Anything read back from
 * localStorage is untrusted (the visitor, an extension or another script can edit it), so it is
 * validated on every read and dropped if malformed.
 */

const STORAGE_KEY = "zennly:saved:v1";
const MAX_SAVED = 200;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EntrySchema = z.object({
  slug: z.string().min(1).max(80).regex(SLUG),
  savedAt: z.number().int().nonnegative(),
});
const ListSchema = z.array(EntrySchema).max(MAX_SAVED);

export type SavedEntry = z.infer<typeof EntrySchema>;

const EMPTY: SavedEntry[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: SavedEntry[] = EMPTY;

function read(): SavedEntry[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  if (!raw) return (cached = EMPTY);
  try {
    const parsed = ListSchema.safeParse(JSON.parse(raw));
    return (cached = parsed.success ? parsed.data : EMPTY);
  } catch {
    return (cached = EMPTY);
  }
}

function write(entries: SavedEntry[]) {
  const raw = JSON.stringify(entries);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
  } catch {
    // Storage unavailable: keep the list in memory for this tab.
    cachedRaw = null;
  }
  cached = entries;
  listeners.forEach((l) => l());
}

export function isValidSlug(slug: string): boolean {
  return slug.length <= 80 && SLUG.test(slug);
}

/**
 * Union of two saved lists, newest `savedAt` winning per slug, capped. Phase 2 reuses this to
 * merge the device list into the account's list on first sign-in.
 */
export function mergeSaved(a: SavedEntry[], b: SavedEntry[]): SavedEntry[] {
  const bySlug = new Map<string, SavedEntry>();
  for (const entry of [...a, ...b]) {
    const prev = bySlug.get(entry.slug);
    if (!prev || entry.savedAt > prev.savedAt) bySlug.set(entry.slug, entry);
  }
  return [...bySlug.values()].sort((x, y) => y.savedAt - x.savedAt).slice(0, MAX_SAVED);
}

export const savedStore = {
  getSnapshot: (): SavedEntry[] => (typeof window === "undefined" ? EMPTY : read()),
  getServerSnapshot: (): SavedEntry[] => EMPTY,

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },

  /** Returns the new saved state, or null if the slug was rejected. */
  toggle(slug: string): boolean | null {
    if (!isValidSlug(slug)) return null;
    const current = read();
    if (current.some((e) => e.slug === slug)) {
      write(current.filter((e) => e.slug !== slug));
      return false;
    }
    write(mergeSaved(current, [{ slug, savedAt: Date.now() }]));
    return true;
  },

  /** Make the device list exactly this (the account's list after sign-in). */
  replace(entries: SavedEntry[]) {
    const valid = ListSchema.safeParse(entries);
    if (valid.success) write([...valid.data].sort((x, y) => y.savedAt - x.savedAt));
  },

  /** Forget the device list (on sign-out, so the next person on a shared device doesn't see it). */
  clear() {
    write(EMPTY);
  },

  merge(entries: SavedEntry[]) {
    const valid = ListSchema.safeParse(entries);
    if (valid.success) write(mergeSaved(read(), valid.data));
  },
};
