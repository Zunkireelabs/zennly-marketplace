import { isOutcomeUnknown } from "./engine-errors";

/**
 * The retry rules for one booking attempt, kept pure so they can be tested.
 *
 *  - One client request id per attempt, REUSED on every retry. book-spa replays an id it has
 *    already seen instead of creating a second booking, so a retry can never double-book.
 *  - A definite refusal (book-spa said no) means nothing was booked: the id is dropped, so the
 *    customer's next try (maybe another time) is a fresh request.
 *  - No answer at all (timeout, dropped connection, garbled reply) means the booking may exist.
 *    One retry is allowed (same id). A second silent failure is final: stop, and tell the
 *    customer to phone the studio. No further automatic or blind retries.
 */
export const MAX_NO_ANSWER_ATTEMPTS = 2;

export type SettledAttempt =
  | { kind: "booked"; booking: unknown }
  | { kind: "refused"; errorCode: string | undefined }
  | { kind: "retry" }
  | { kind: "gave-up" };

export type BookingAttempt = {
  /** The request id to send. Stable across retries until the attempt is refused or reset. */
  key(): string;
  /** Interpret the parsed reply from /api/booking/create (null if it threw or wasn't JSON). */
  settle(reply: { ok?: boolean; booking?: unknown; errorCode?: string } | null): SettledAttempt;
  /**
   * True while an earlier send may have created a booking (after a no-answer retry or give-up).
   * The date, time and service must not change then: a same-id retry replays the ORIGINAL booking,
   * so changed inputs would no longer match what was booked.
   */
  locked(): boolean;
  /** Start over (new booking flow). */
  reset(): void;
};

export function createBookingAttempt(newId: () => string = () => crypto.randomUUID()): BookingAttempt {
  let key: string | null = null;
  let noAnswers = 0;

  return {
    key() {
      if (!key) key = newId();
      return key;
    },
    settle(reply) {
      if (reply?.ok) {
        noAnswers = 0;
        return { kind: "booked", booking: reply.booking };
      }
      if (isOutcomeUnknown(reply?.errorCode)) {
        noAnswers += 1;
        return noAnswers >= MAX_NO_ANSWER_ATTEMPTS ? { kind: "gave-up" } : { kind: "retry" };
      }
      // Definite refusal: nothing was booked, so the next attempt starts clean.
      key = null;
      noAnswers = 0;
      return { kind: "refused", errorCode: reply?.errorCode };
    },
    locked() {
      return noAnswers > 0;
    },
    reset() {
      key = null;
      noAnswers = 0;
    },
  };
}
