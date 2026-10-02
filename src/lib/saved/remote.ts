import { z } from "zod";
import type { SavedEntry } from "./store";

/**
 * Talks to /api/saved. Only used while signed in with a real adapter; every call fails soft (the
 * device list keeps working) because saving must never feel broken.
 */

const Reply = z.object({
  ok: z.literal(true),
  data: z.array(z.object({ slug: z.string(), savedAt: z.number() })),
});

async function send(path: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    return null;
  }
}

/** Adds the device list to the account and returns the account's full list, or null on failure. */
export async function mergeToAccount(entries: SavedEntry[]): Promise<SavedEntry[] | null> {
  const res = await send("/api/saved/merge", { entries });
  if (!res?.ok) return null;
  const parsed = Reply.safeParse(await res.json().catch(() => null));
  return parsed.success ? parsed.data.data : null;
}

export async function setSavedRemote(slug: string, saved: boolean): Promise<void> {
  await send("/api/saved", { slug, saved });
}
