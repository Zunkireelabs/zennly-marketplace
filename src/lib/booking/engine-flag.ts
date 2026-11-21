/**
 * Default-off kill switch for the real-booking drawer (docs/booking-migration-plan.md, Phase 1).
 * A drawer that shows real availability but can't actually save a booking is worse than the
 * honest simulator — a customer could believe they've booked. Flip to "on" only once book-spa's
 * create endpoint lands and the write path is wired; until then every provider, connected or
 * not, keeps today's simulator behavior byte-for-byte.
 */
export function engineBookingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENGINE_BOOKING === "on";
}
