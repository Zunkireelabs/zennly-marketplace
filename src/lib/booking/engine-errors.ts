/**
 * Plain-language messages for every refusal book-spa can return while creating a booking
 * (public_create_booking, migrations 335/409, plus the marketplace-create-booking Edge Function
 * and src/app/api/booking/create/route.ts). One map, easy to extend: a new bookX code is one new
 * line in MESSAGES. Raw server text is NEVER shown — an unrecognised code gets SAFE_DEFAULT.
 *
 * No message here may promise something we can't keep (refunds, free cancellation, "we'll
 * hold it"). Where the customer needs a human, it says "contact the studio".
 */

const SLOT_TAKEN = "Sorry, that time was just taken. Please pick another time.";
const NOT_LIVE = "Online booking isn't available yet. Please contact the studio.";
const NO_STAFF = "No one is available at that time. Please pick another time.";

const MESSAGES: Record<string, string> = {
  // The studio isn't open for online booking, or the request doesn't fit its rules.
  ORG_NOT_ENABLED: NOT_LIVE,
  // Ours, from the live check (ZNLY-346): the studio isn't switched on, or we couldn't check.
  BOOKING_NOT_LIVE: NOT_LIVE,
  BOOKING_UNAVAILABLE: "Online booking isn't available right now. Please try again in a little while, or contact the studio.",
  LOCATION_INACTIVE: "That location isn't taking bookings right now. Please choose another location or contact the studio.",
  INVALID_BRANCH: "That location isn't available anymore. Please choose another.",
  SERVICE_NOT_AT_LOCATION: "That service isn't offered at this location. Please choose another location or service.",
  INVALID_SERVICE: "That service isn't available to book online anymore. Please choose another.",
  INVALID_TIME: "That time isn't valid. Please pick another time.",
  NO_CONTACT_INFO: "Please enter a phone number.",

  // Opening hours, closures and dates.
  BRANCH_CLOSED: "The studio is closed on that day. Please pick another day.",
  OUTSIDE_OPENING_HOURS: "That time is outside the studio's opening hours. Please pick a time within opening hours.",
  CLOSED_DATE: "The studio is closed on that date. Please pick another day.",
  IN_THE_PAST: "That time has already passed. Please pick a later time.",
  BRANCH_ADVANCE_BOOKING_WINDOW: "Bookings aren't open that far ahead. Please pick an earlier date.",
  BOOKING_CROSSES_MIDNIGHT: "That time would run past midnight. Please choose an earlier start time.",

  // Capacity: rooms, staff, online limits.
  INVALID_ROOM: SLOT_TAKEN,
  ROOM_INACTIVE: SLOT_TAKEN,
  ROOM_FULL: SLOT_TAKEN,
  ROOMS_FULL: SLOT_TAKEN,
  THERAPIST_CONFLICT: SLOT_TAKEN,
  BRANCH_ONLINE_CAPACITY: "This time is fully booked online. Please choose another time.",
  INVALID_THERAPIST: NO_STAFF,
  THERAPIST_INACTIVE: NO_STAFF,
  THERAPIST_ABSENT: "That staff member isn't available on this date. Please pick another time.",
  THERAPIST_CHECKED_OUT: "That staff member has finished for the day. Please pick another time.",
  THERAPIST_NOT_ELIGIBLE: "That staff member can't do this service. Please pick another time.",
  ON_LEAVE: "That staff member isn't available on this date. Please pick another time.",
  OVERLAP: SLOT_TAKEN,
  BLOCKED: "That time isn't available. Please pick another time.",
  ON_BREAK: "That staff member is on a break then. Please pick another time.",
  INVALID_GENDER_PREFERENCE: "That staff preference isn't available. Please pick another option or time.",

  // Sign-in and request problems (nothing was booked).
  // The request id belongs to a different booking. The attempt drops the id on any refusal, so the
  // next press of Confirm is a brand-new request; never retried with the same id.
  IDEMPOTENCY_KEY_CONFLICT: "Something went wrong with this booking request. Nothing was booked. Please start again.",
  UNAUTHENTICATED: "Please log in to book.",
  UNAUTHORIZED: "We couldn't complete your booking. Please contact the studio.",
  INVALID_REQUEST: "Some booking details are missing or not valid. Please check them and try again.",
  INVALID_JSON: "Some booking details are missing or not valid. Please check them and try again.",
  MISSING_FIELD: "Some booking details are missing. Please check them and try again.",
  FORBIDDEN: "We couldn't complete your booking. Please refresh the page and try again.",
  METHOD_NOT_ALLOWED: "We couldn't complete your booking. Please contact the studio.",
  SERVER_MISCONFIGURED: "Online booking is temporarily unavailable. Please contact the studio.",
};

/** Shown for any code not in MESSAGES. Says nothing happened that we can't be sure of. */
export const SAFE_DEFAULT = "We couldn't complete your booking. Please pick another time, or contact the studio.";

/** Shown when the closed-day/hours/closures data couldn't be loaded, so no times are offered. */
export const TIMES_UNAVAILABLE = "Times can't be loaded right now. Please try again, or contact the studio.";

/**
 * Codes where we do NOT know whether the booking was created: the request left but we never got
 * a clear answer (timeout, dropped connection, garbled or 5xx response). Everything else is a
 * definite refusal — book-spa said no, and nothing was booked.
 */
const OUTCOME_UNKNOWN = new Set(["UNREACHABLE", "UNEXPECTED_ERROR"]);

export function isOutcomeUnknown(errorCode: string | undefined | null): boolean {
  // No code at all (a thrown fetch, a non-JSON reply) is the same as not knowing.
  return !errorCode || OUTCOME_UNKNOWN.has(errorCode);
}

/** Maps a refusal code to plain text. The server's own `message` is deliberately ignored. */
export function bookingErrorMessage(errorCode: string | undefined | null): string {
  if (errorCode && Object.prototype.hasOwnProperty.call(MESSAGES, errorCode)) return MESSAGES[errorCode];
  return SAFE_DEFAULT;
}

/** Text for a booking whose outcome is unknown. Sends the customer to the studio, not to a blind retry. */
export function unknownOutcomeMessage(studioName: string, phone: string | null | undefined): string {
  const call = phone ? `Please call ${studioName} on ${phone} to check.` : `Please contact ${studioName} to check.`;
  return `We couldn't confirm your booking. It may have gone through. ${call}`;
}

/** Shown after the FIRST silent failure, while one same-id retry is still allowed. */
export function noAnswerRetryMessage(phone: string | null | undefined): string {
  const studio = phone ? `contact the studio on ${phone}` : "contact the studio";
  return `We didn't get an answer from the booking system, so we can't tell if your booking went through. You can press Confirm once more (it won't book twice), or ${studio}.`;
}

/** Text for the "contact the studio" line, used in place of any cancellation promise. */
export function changeOrCancelText(phone: string | null | undefined): string {
  return phone ? `To change or cancel, contact the studio on ${phone}.` : "To change or cancel, contact the studio.";
}
