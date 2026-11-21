import type { StudioStatus } from "./studio-status";

/**
 * What the studio page offers for booking, decided on the server for each request and handed to
 * the page as plain data (no secret, no bookX call from the browser). ZNLY-346.
 *
 *   live         Book buttons work as today
 *   not_live     bookX knows the studio but it isn't switched on: sentence + tap-to-call
 *   unavailable  we couldn't check: a softer sentence, no phone
 *   demo         no bookX link at all: a made-up listing, booking is off. ONLY this case: a
 *                studio that has a link but bookX doesn't know is a real studio with a bad link
 */
export type BookingAvailability =
  | { state: "live" }
  | { state: "not_live"; phone: string | null }
  | { state: "unavailable" }
  | { state: "demo" };

export function availabilityFor(engineProviderId: string | null | undefined, status: StudioStatus): BookingAvailability {
  if (!engineProviderId) return { state: "demo" };
  switch (status.status) {
    case "live":
      return { state: "live" };
    case "not_live":
      return { state: "not_live", phone: status.phone };
    case "not_found":
      // A linked studio bookX has never heard of is a misconfigured link (a mistyped slug), not a
      // demo. Say "not available yet" to the customer and make noise for us.
      console.warn(`[booking] studio "${engineProviderId}" has a bookX link but bookX answered not_found: check its engineProviderId`);
      return { state: "not_live", phone: null };
    default:
      return { state: "unavailable" };
  }
}

/** A tel: link that keeps only digits and a leading plus. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
