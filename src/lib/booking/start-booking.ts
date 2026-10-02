import { track } from "@/lib/analytics/track";
import { normalizeName } from "@/lib/auth/normalize";
import type { Provider } from "@/lib/providers";

/**
 * The single entry point behind every Book button. Components never build or open an engine URL
 * themselves; they call this. Phase 3 swaps the body (signed identity token) and nothing else.
 */

export type ForWhom = { kind: "me" } | { kind: "other"; name: string };

export type BookingSelection = { serviceIds: string[] };

export type StartBookingInput = {
  provider: Provider;
  selection: BookingSelection;
  forWhom?: ForWhom;
};

export type StartBookingResult =
  /** No engine link for this studio: the caller opens the in-page demo drawer. */
  | { kind: "drawer"; handoffId: string }
  /** The studio's booking page was opened in a new tab. */
  | { kind: "external"; handoffId: string; url: string }
  /** The link was missing, malformed or not on the allowlist. Nothing was opened. */
  | { kind: "blocked"; reason: string };

/**
 * Hosts a booking link may point to. Empty until the engine is connected (Phase 3); a link to
 * any other host is refused, so a bad or tampered database value can't send people elsewhere.
 */
const BOOKING_HOST_ALLOWLIST: readonly string[] = [];

/** Builds the engine link, or null if the base isn't a plain https URL on the allowlist. */
export function buildHandoffUrl(base: string, handoffId: string, forWhom: ForWhom): string | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!BOOKING_HOST_ALLOWLIST.includes(url.hostname)) return null;
  url.searchParams.set("source", "zennly");
  url.searchParams.set("handoff_id", handoffId);
  // Only the flag travels in the URL. The attendee's name stays in the app: URLs end up in
  // server logs, browser history and referrers.
  url.searchParams.set("for", forWhom.kind);
  return url.toString();
}

function newHandoffId(): string {
  return crypto.randomUUID();
}

/** Keeps `forWhom` well-formed; a malformed "other" falls back to the booker. */
function sanitizeForWhom(forWhom: ForWhom | undefined): ForWhom {
  if (forWhom?.kind === "other") {
    const name = normalizeName(forWhom.name);
    return { kind: "other", name: name ?? "" };
  }
  return { kind: "me" };
}

export function startBooking({ provider, selection, forWhom }: StartBookingInput): StartBookingResult {
  const who = sanitizeForWhom(forWhom);
  const handoffId = newHandoffId();

  track("book_clicked", {
    slug: provider.slug,
    service_count: selection.serviceIds.length,
    for_whom: who.kind,
  });

  const base = provider.bookingUrl;
  if (!base) return { kind: "drawer", handoffId };

  const url = buildHandoffUrl(base, handoffId, who);
  if (!url) return { kind: "blocked", reason: "This studio's booking link isn't available right now." };

  track("handoff_started", { slug: provider.slug, destination: "engine", for_whom: who.kind });
  window.open(url, "_blank", "noopener,noreferrer");
  return { kind: "external", handoffId, url };
}
