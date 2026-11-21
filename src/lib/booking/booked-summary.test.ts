import { describe, expect, it } from "vitest";
import { bookedWhen, readBookedSummary } from "./booked-summary";

// Shape of book-spa's real success response (migration-409): booking { id, booking_number, status, date,
// start_time, end_time, service_name_snapshot, room_name_snapshot, therapist_name_snapshot, final_amount }.
const RESPONSE = {
  id: "9b1f0c1e-0000-4000-8000-000000000001",
  booking_number: "BK-2026-0042",
  status: "Confirmed",
  date: "2026-11-24",
  start_time: "10:00:00",
  end_time: "11:00:00",
  service_name_snapshot: "Body Scrub - 60min",
  room_name_snapshot: "Room 3",
  therapist_name_snapshot: null,
  final_amount: 2500,
};

const label = (iso: string) => `D(${iso})`;

describe("success screen is built from the bookX response, never the form", () => {
  it("reads number, date, time, service and price from the response", () => {
    expect(readBookedSummary(RESPONSE)).toEqual({
      number: "BK-2026-0042",
      date: "2026-11-24",
      startTime: "10:00:00",
      serviceName: "Body Scrub - 60min",
      amount: 2500,
    });
  });

  it("a replayed ORIGINAL booking is shown as booked, even if the form has since changed", () => {
    // The customer booked 10:00, lost the reply, then (somehow) the form says 14:00. The response wins.
    const formTime = "2:00 PM";
    const shown = bookedWhen(readBookedSummary(RESPONSE), label);
    expect(shown).toBe("D(2026-11-24) · 10:00 AM");
    expect(shown).not.toContain(formTime);
  });

  it("formats the time from start_time in 12-hour clock", () => {
    expect(bookedWhen(readBookedSummary({ ...RESPONSE, start_time: "15:30:00" }), label)).toBe("D(2026-11-24) · 3:30 PM");
  });

  it("accepts a numeric string amount (database numeric) and a numeric booking number", () => {
    const s = readBookedSummary({ ...RESPONSE, final_amount: "2500.00", booking_number: 4242 });
    expect(s.amount).toBe(2500);
    expect(s.number).toBe("4242");
  });

  it("a field bookX didn't send is null and left out, not filled in from anywhere else", () => {
    const s = readBookedSummary({ booking_number: "BK-1" });
    expect(s).toEqual({ number: "BK-1", date: null, startTime: null, serviceName: null, amount: null });
    expect(bookedWhen(s, label)).toBeNull();
  });

  it("only a date, or only a time, still reads sensibly", () => {
    expect(bookedWhen(readBookedSummary({ date: "2026-11-24" }), label)).toBe("D(2026-11-24)");
    expect(bookedWhen(readBookedSummary({ start_time: "09:00:00" }), label)).toBe("9:00 AM");
  });

  it("garbage in → all null, no throw", () => {
    for (const bad of [null, undefined, "x", 5, [], { date: "tomorrow", start_time: "later", final_amount: "free" }]) {
      expect(readBookedSummary(bad)).toEqual({ number: null, date: null, startTime: null, serviceName: null, amount: null });
    }
  });

  it("a zero price is a real price, not 'missing'", () => {
    expect(readBookedSummary({ ...RESPONSE, final_amount: 0 }).amount).toBe(0);
  });
});
