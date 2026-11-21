import { describe, expect, it } from "vitest";
import {
  SAFE_DEFAULT,
  bookingErrorMessage,
  changeOrCancelText,
  isOutcomeUnknown,
  noAnswerRetryMessage,
  unknownOutcomeMessage,
} from "./engine-errors";

/** Every error_code bookX can return today (public_create_booking 335/409+, its guards, the Edge Function, our route). */
const BOOKX_CODES = [
  "ORG_NOT_ENABLED", "BOOKING_NOT_LIVE", "BOOKING_UNAVAILABLE", "LOCATION_INACTIVE", "INVALID_BRANCH", "INVALID_SERVICE", "INVALID_TIME",
  "NO_CONTACT_INFO", "BRANCH_CLOSED", "OUTSIDE_OPENING_HOURS", "CLOSED_DATE", "IN_THE_PAST",
  "BRANCH_ADVANCE_BOOKING_WINDOW", "BOOKING_CROSSES_MIDNIGHT", "INVALID_ROOM", "ROOM_INACTIVE",
  "ROOM_FULL", "ROOMS_FULL", "THERAPIST_CONFLICT", "BRANCH_ONLINE_CAPACITY", "INVALID_THERAPIST",
  "THERAPIST_INACTIVE", "THERAPIST_ABSENT", "THERAPIST_CHECKED_OUT", "THERAPIST_NOT_ELIGIBLE",
  "ON_LEAVE", "OVERLAP", "BLOCKED", "ON_BREAK", "INVALID_GENDER_PREFERENCE",
  "IDEMPOTENCY_KEY_CONFLICT", "UNAUTHENTICATED", "UNAUTHORIZED", "INVALID_REQUEST", "INVALID_JSON",
  "MISSING_FIELD", "FORBIDDEN", "METHOD_NOT_ALLOWED", "SERVER_MISCONFIGURED",
];

describe("bookingErrorMessage", () => {
  it.each(BOOKX_CODES)("%s maps to a plain, specific message", (code) => {
    const text = bookingErrorMessage(code);
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toBe(SAFE_DEFAULT); // every known code has its own wording
    expect(text).not.toMatch(/[A-Z]{3,}_[A-Z_]+/); // never the raw code
    expect(text).not.toMatch(/P0\d{3}|PT\d{3}|SQLSTATE|exception|rpc/i); // never database talk
  });

  it("the four new opening-hours codes say what to do", () => {
    expect(bookingErrorMessage("BRANCH_CLOSED")).toMatch(/closed/i);
    expect(bookingErrorMessage("OUTSIDE_OPENING_HOURS")).toMatch(/opening hours/i);
    expect(bookingErrorMessage("CLOSED_DATE")).toMatch(/closed/i);
    expect(bookingErrorMessage("IN_THE_PAST")).toMatch(/passed/i);
  });

  it("an unknown code gets the safe default", () => {
    expect(bookingErrorMessage("SOMETHING_NEW_FROM_BOOKX")).toBe(SAFE_DEFAULT);
  });

  it("missing or empty codes get the safe default", () => {
    expect(bookingErrorMessage(undefined)).toBe(SAFE_DEFAULT);
    expect(bookingErrorMessage(null)).toBe(SAFE_DEFAULT);
    expect(bookingErrorMessage("")).toBe(SAFE_DEFAULT);
  });

  it("does not treat inherited object keys as codes", () => {
    expect(bookingErrorMessage("constructor")).toBe(SAFE_DEFAULT);
    expect(bookingErrorMessage("__proto__")).toBe(SAFE_DEFAULT);
    expect(bookingErrorMessage("toString")).toBe(SAFE_DEFAULT);
  });

  it("never makes a promise we can't keep", () => {
    const all = [...BOOKX_CODES.map(bookingErrorMessage), SAFE_DEFAULT, changeOrCancelText("01-4444444")];
    for (const text of all) {
      expect(text).not.toMatch(/free cancellation|24 hours|refund|guarantee|we will hold|we'll hold/i);
    }
  });
});

describe("isOutcomeUnknown (did the booking maybe go through?)", () => {
  it("no code, UNREACHABLE and UNEXPECTED_ERROR are unknown", () => {
    expect(isOutcomeUnknown(undefined)).toBe(true);
    expect(isOutcomeUnknown(null)).toBe(true);
    expect(isOutcomeUnknown("UNREACHABLE")).toBe(true);
    expect(isOutcomeUnknown("UNEXPECTED_ERROR")).toBe(true);
  });

  it.each(BOOKX_CODES)("%s is a definite refusal (nothing was booked)", (code) => {
    expect(isOutcomeUnknown(code)).toBe(false);
  });
});

describe("customer-facing outcome text", () => {
  it("unknown outcome: says it may have gone through, names the studio and phone, never says retry", () => {
    const text = unknownOutcomeMessage("Nuad Thai Spa", "01-5555555");
    expect(text).toMatch(/may have gone through/i);
    expect(text).toContain("Nuad Thai Spa");
    expect(text).toContain("01-5555555");
    expect(text).not.toMatch(/try again|retry/i);
  });

  it("unknown outcome without a phone still sends them to the studio", () => {
    expect(unknownOutcomeMessage("Nuad Thai Spa", null)).toMatch(/contact Nuad Thai Spa/);
  });

  it("the one same-id retry is described as safe", () => {
    expect(noAnswerRetryMessage("01-5555555")).toMatch(/won't book twice/);
    expect(noAnswerRetryMessage("01-5555555")).toContain("01-5555555");
  });

  it("change/cancel wording is 'contact the studio' + phone, with or without a phone", () => {
    expect(changeOrCancelText("01-5555555")).toBe("To change or cancel, contact the studio on 01-5555555.");
    expect(changeOrCancelText(null)).toBe("To change or cancel, contact the studio.");
  });
});
