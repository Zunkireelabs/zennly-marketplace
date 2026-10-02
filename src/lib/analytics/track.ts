/**
 * Activity tracking stub. Call sites are real; Phase 2 swaps `sink` for a write to the `events`
 * table. Until then events are logged to the console in development only and dropped in production.
 *
 * Privacy: events carry an anonymous id and allowlisted, non-identifying props. Phone numbers,
 * emails, names and free text never go through here; anything that looks like them is dropped.
 */

export type TrackEvent =
  | "provider_viewed"
  | "search_run"
  | "studio_saved"
  | "studio_unsaved"
  | "book_clicked"
  | "handoff_started"
  | "login_started"
  | "login_completed";

const ALLOWED_PROPS = new Set([
  "slug",
  "method",
  "reason",
  "for_whom",
  "service_count",
  "has_query",
  "destination",
]);

type PropValue = string | number | boolean;
export type TrackProps = Partial<Record<string, PropValue>>;

const ANON_KEY = "zennly:anon-id:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let memoryId: string | null = null;

function anonymousId(): string {
  try {
    const existing = window.localStorage.getItem(ANON_KEY);
    if (existing && UUID.test(existing)) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    // Storage blocked: keep an id for this page load only.
    return (memoryId ??= crypto.randomUUID());
  }
}

function looksPersonal(value: string): boolean {
  return /@/.test(value) || /\d{7,}/.test(value.replace(/[\s()-]/g, ""));
}

function cleanProps(props: TrackProps): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(key) || value === undefined) continue;
    if (typeof value === "string") {
      if (value.length > 80 || looksPersonal(value)) continue;
    }
    out[key] = value;
  }
  return out;
}

// Events are stored only when NEXT_PUBLIC_TRACK_EVENTS=on. Leave it off until the consent / cookie
// notice for the anonymous id is decided (global users, so GDPR-style rules may apply).
const STORE_EVENTS = process.env.NEXT_PUBLIC_TRACK_EVENTS === "on";

function sink(payload: { event: TrackEvent; props: Record<string, PropValue>; anonId: string; at: string }) {
  if (process.env.NODE_ENV !== "production") console.info("[track]", payload.event, payload.props, payload.anonId);
  if (!STORE_EVENTS) return;
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: payload.event, anonId: payload.anonId, props: payload.props }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {});
}

export function track(event: TrackEvent, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    sink({ event, props: cleanProps(props), anonId: anonymousId(), at: new Date().toISOString() });
  } catch {
    // Tracking must never break the page.
  }
}
