import { minutesToTime12, timeToMinutes } from "./engine-availability";

/**
 * What the success screen shows, read from book-spa's response (booking.date, start_time,
 * service_name_snapshot, final_amount, booking_number) and NEVER from the form. Reason: after a
 * lost reply, a retry with the same request id replays the ORIGINAL booking, so if the customer
 * had changed the time in between, the form would show a time they were not booked for.
 * A field book-spa didn't send is null and simply isn't shown. We never fill it from the form.
 */
export type BookedSummary = {
  number: string | null;
  date: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:MM[:SS]
  serviceName: string | null;
  amount: number | null; // NPR
};

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

export function readBookedSummary(booking: unknown): BookedSummary {
  const b = (booking && typeof booking === "object" ? booking : {}) as Record<string, unknown>;
  const amount = b.final_amount === null || b.final_amount === undefined || b.final_amount === "" ? NaN : Number(b.final_amount);
  const date = text(b.date);
  const start = text(b.start_time);
  return {
    number: text(b.booking_number),
    date: date && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : null,
    startTime: start && /^\d{2}:\d{2}/.test(start) ? start : null,
    serviceName: text(b.service_name_snapshot),
    amount: Number.isFinite(amount) ? amount : null,
  };
}

/** "Mon, 24 Nov · 10:00 AM" from the response's own date and time; null parts are left out. */
export function bookedWhen(summary: BookedSummary, dateLabel: (iso: string) => string): string | null {
  const parts = [
    summary.date ? dateLabel(summary.date) : null,
    summary.startTime ? minutesToTime12(timeToMinutes(summary.startTime)) : null,
  ].filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(" · ") : null;
}
