/**
 * Human-readable messages for public_create_booking's error taxonomy (book-spa
 * migration-335-public-create-booking.sql), as surfaced through
 * src/app/api/booking/create/route.ts. Kept as one map so the drawer never has to know the
 * taxonomy itself — just the fallback for a code this map doesn't recognise yet.
 */
const MESSAGES: Record<string, string> = {
  ORG_NOT_ENABLED: "This business isn't accepting online bookings right now.",
  INVALID_BRANCH: "That location isn't available anymore. Please choose another.",
  INVALID_SERVICE: "That service isn't available anymore. Please choose another.",
  NO_CONTACT_INFO: "Please enter a phone number.",
  INVALID_ROOM: "Sorry, that time just filled up. Please pick another slot.",
  ROOM_INACTIVE: "Sorry, that time just filled up. Please pick another slot.",
  ROOM_FULL: "Sorry, that time just filled up. Please pick another slot.",
  ROOMS_FULL: "Sorry, that time just filled up. Please pick another slot.",
  INVALID_THERAPIST: "That staff member isn't available at this time. Please pick another time.",
  THERAPIST_INACTIVE: "That staff member isn't available. Please pick another time.",
  THERAPIST_ABSENT: "That staff member isn't available on this date. Please pick another time.",
  THERAPIST_CHECKED_OUT: "That staff member has checked out for the day. Please pick another time.",
  THERAPIST_NOT_ELIGIBLE: "That staff member can't take this service. Please pick another time.",
  THERAPIST_CONFLICT: "That time slot was just taken. Please pick another.",
  BRANCH_ONLINE_CAPACITY: "This time is fully booked — no one's available. Please choose another time.",
  BOOKING_CROSSES_MIDNIGHT: "That time would run past midnight. Please choose an earlier start time.",
  UNAUTHENTICATED: "Please log in to book.",
  UNREACHABLE: "Could not reach the booking system. Please try again.",
};

const FALLBACK = "Something went wrong creating your booking. Please try again.";

export function bookingErrorMessage(errorCode: string | undefined, message: string | undefined): string {
  if (errorCode && MESSAGES[errorCode]) return MESSAGES[errorCode];
  return message || FALLBACK;
}
