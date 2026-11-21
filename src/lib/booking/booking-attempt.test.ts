import { describe, expect, it } from "vitest";
import { createBookingAttempt } from "./booking-attempt";

function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

describe("booking attempt: retries never double-book", () => {
  it("reuses the SAME client request id across retries", () => {
    const attempt = createBookingAttempt(ids());
    const first = attempt.key();
    expect(attempt.settle(null)).toEqual({ kind: "retry" }); // no answer
    expect(attempt.key()).toBe(first);
    expect(attempt.key()).toBe(first);
  });

  it("a first silent failure allows exactly one retry; the second is final", () => {
    const attempt = createBookingAttempt(ids());
    expect(attempt.settle(null).kind).toBe("retry");
    expect(attempt.settle(null).kind).toBe("gave-up");
  });

  it("stays given-up: further silent failures never allow more retries", () => {
    const attempt = createBookingAttempt(ids());
    attempt.settle(null);
    attempt.settle(null);
    expect(attempt.settle({ errorCode: "UNREACHABLE" }).kind).toBe("gave-up");
    expect(attempt.settle({ errorCode: "UNEXPECTED_ERROR" }).kind).toBe("gave-up");
  });

  it("UNREACHABLE and UNEXPECTED_ERROR count as no answer, same as a thrown fetch", () => {
    const attempt = createBookingAttempt(ids());
    expect(attempt.settle({ ok: false, errorCode: "UNREACHABLE" }).kind).toBe("retry");
    expect(attempt.settle({ ok: false, errorCode: "UNEXPECTED_ERROR" }).kind).toBe("gave-up");
  });

  it("a definite refusal drops the id so the next try is a fresh request", () => {
    const attempt = createBookingAttempt(ids());
    const first = attempt.key();
    expect(attempt.settle({ ok: false, errorCode: "ROOM_FULL" })).toEqual({ kind: "refused", errorCode: "ROOM_FULL" });
    expect(attempt.key()).not.toBe(first);
  });

  it("a refusal resets the no-answer count (it's a clean slate)", () => {
    const attempt = createBookingAttempt(ids());
    attempt.settle(null); // 1 silent failure
    attempt.settle({ ok: false, errorCode: "ROOM_FULL" }); // refused → reset
    expect(attempt.settle(null).kind).toBe("retry"); // first silent failure of a new attempt
  });

  it("IDEMPOTENCY_KEY_CONFLICT is refused AND forces a new id (never retried with the same one)", () => {
    const attempt = createBookingAttempt(ids());
    const first = attempt.key();
    const settled = attempt.settle({ ok: false, errorCode: "IDEMPOTENCY_KEY_CONFLICT" });
    expect(settled.kind).toBe("refused");
    expect(attempt.key()).not.toBe(first);
  });

  it("success returns the booking and keeps the id (a replay of it is the same booking)", () => {
    const attempt = createBookingAttempt(ids());
    const k = attempt.key();
    expect(attempt.settle({ ok: true, booking: { booking_number: "BK-1" } })).toEqual({
      kind: "booked",
      booking: { booking_number: "BK-1" },
    });
    expect(attempt.key()).toBe(k);
  });

  it("an unknown error code is a refusal with the code passed through for the safe default", () => {
    const attempt = createBookingAttempt(ids());
    expect(attempt.settle({ ok: false, errorCode: "BRAND_NEW_CODE" })).toEqual({
      kind: "refused",
      errorCode: "BRAND_NEW_CODE",
    });
  });

  it("reset() starts a new booking flow", () => {
    const attempt = createBookingAttempt(ids());
    const first = attempt.key();
    attempt.settle(null);
    attempt.reset();
    expect(attempt.key()).not.toBe(first);
    expect(attempt.settle(null).kind).toBe("retry");
  });
});

describe("booking attempt: inputs lock while the outcome is unknown", () => {
  it("is unlocked before anything is sent", () => {
    expect(createBookingAttempt(ids()).locked()).toBe(false);
  });

  it("locks after a no-answer (the retry state) and stays locked after give-up", () => {
    const attempt = createBookingAttempt(ids());
    expect(attempt.settle(null).kind).toBe("retry");
    expect(attempt.locked()).toBe(true);
    expect(attempt.settle(null).kind).toBe("gave-up");
    expect(attempt.locked()).toBe(true);
  });

  it("stays locked across repeated reads, so the key can't be swapped for changed inputs", () => {
    const attempt = createBookingAttempt(ids());
    const first = attempt.key();
    attempt.settle(null);
    expect(attempt.locked()).toBe(true);
    expect(attempt.key()).toBe(first);
  });

  it("a definite refusal unlocks (nothing was booked, the customer may change anything)", () => {
    const attempt = createBookingAttempt(ids());
    attempt.settle(null);
    attempt.settle({ ok: false, errorCode: "ROOM_FULL" });
    expect(attempt.locked()).toBe(false);
  });

  it("a successful replay after a no-answer unlocks and returns the booking", () => {
    const attempt = createBookingAttempt(ids());
    attempt.settle(null);
    expect(attempt.settle({ ok: true, booking: { booking_number: "BK-9" } }).kind).toBe("booked");
    expect(attempt.locked()).toBe(false);
  });

  it("reset() unlocks", () => {
    const attempt = createBookingAttempt(ids());
    attempt.settle(null);
    attempt.reset();
    expect(attempt.locked()).toBe(false);
  });
});
