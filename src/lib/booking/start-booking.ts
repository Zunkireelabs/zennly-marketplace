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
 * Hosts a booking link may point to. A link to any other host is refused, so a bad or tampered
 * database value can't send people elsewhere. book-spa's customer booking flow lives at
 * app.zennly.io/:orgSlug (docs/booking-integration-plan.md, Stage 1).
 */
const BOOKING_HOST_ALLOWLIST: readonly string[] = ["app.zennly.io"];

/**
 * Local book-spa dev servers, so the whole journey stays on localhost instead of jumping to
 * production. Allowed over http because that's all a dev server speaks — this is the ONLY
 * exemption from the https requirement, and it's limited to loopback, which can't be reached
 * from another machine. Every other host still needs https and a place on the allowlist above.
 */
function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** A root-absolute path with no host at all ("/book/nuad-thai-spa"), not a protocol-relative "//host/...". */
function isRelativeSameOrigin(base: string): boolean {
  return base.startsWith("/") && !base.startsWith("//");
}

/**
 * Builds the engine link, or null if the base is neither a same-origin relative path nor a
 * plain https (or loopback) URL on the allowlist.
 *
 * The same-origin relative case (bookingProxyTarget set in providers-data.ts's toProvider —
 * next.config.ts's /book/* rewrite is what makes this resolve to book-spa) is handled
 * separately and FIRST, and deliberately skips every check below: a root-absolute path has no
 * host component to validate at all, so there is nothing a tampered database value could set
 * it to that would send someone off-site — the browser can only ever resolve it against the
 * current page's own origin. This does not weaken the allowlist for absolute URLs; that logic
 * is unchanged.
 */
export function buildHandoffUrl(base: string, handoffId: string, forWhom: ForWhom, serviceId?: string): string | null {
  if (isRelativeSameOrigin(base)) {
    const params = new URLSearchParams();
    params.set("source", "zennly");
    params.set("handoff_id", handoffId);
    params.set("for", forWhom.kind);
    if (serviceId) params.set("service", serviceId);
    return `${base}?${params.toString()}`;
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const loopback = isLoopback(url.hostname);
  if (!loopback && url.protocol !== "https:") return null;
  if (loopback && url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!loopback && !BOOKING_HOST_ALLOWLIST.includes(url.hostname)) return null;
  url.searchParams.set("source", "zennly");
  url.searchParams.set("handoff_id", handoffId);
  // Only the flag travels in the URL. The attendee's name stays in the app: URLs end up in
  // server logs, browser history and referrers.
  url.searchParams.set("for", forWhom.kind);
  if (serviceId) url.searchParams.set("service", serviceId);
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

  // Only ever the first selected service, and only when the customer actually picked one — a
  // generic "Book now" with nothing selected sends no service param at all. Whatever is in
  // selection.serviceIds is already an engine service id for any connected provider (the
  // page's services/booking-card source from the engine, see src/lib/booking/engine-live-
  // services.ts), never the seed's positional `${slug}-${i}` ids, which book-spa wouldn't
  // recognize.
  const serviceId = selection.serviceIds[0];
  const url = buildHandoffUrl(base, handoffId, who, serviceId);
  if (!url) return { kind: "blocked", reason: "This studio's booking link isn't available right now." };

  track("handoff_started", { slug: provider.slug, destination: "engine", for_whom: who.kind });
  // Same tab for a same-origin path (the /book/* proxy): booking is a continuation of the
  // journey, not a detour, and a new tab strands the customer's back button. A cross-origin
  // absolute URL still opens in its own tab — that case really is leaving the site, and
  // noopener/noreferrer matter there.
  if (isRelativeSameOrigin(base)) {
    window.location.assign(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return { kind: "external", handoffId, url };
}
