import { describe, expect, it } from "vitest";
import {
  computeSoloSlots,
  nepalClock,
  slotRangeForDate,
  type BranchHours,
  type SoloDay,
} from "./engine-availability";

/**
 * QC harness for the drawer's availability maths. Fixtures are shaped like the real bookX reads:
 * branch_working_hours rows (day_of_week Monday = 0 … Sunday = 6, time as "HH:MM:SS"),
 * public_check_branch_bookings_range rows, public_check_therapist_bookings_range rows.
 *
 * Calendar used (2026): Fri 20 Nov, Sat 21, Sun 22, Mon 23, Tue 24, Wed 25.
 * Kathmandu is UTC+05:45, so "Mon 23 Nov 12:10 in Kathmandu" is 2026-11-23T06:25:00Z.
 * Run this file under several server timezones to prove it doesn't depend on the host clock:
 *   TZ=UTC npx vitest run src/lib/booking/engine-availability.test.ts
 *   TZ=America/Los_Angeles npx vitest run src/lib/booking/engine-availability.test.ts
 */

const SUN = "2026-11-22";
const MON = "2026-11-23";
const TUE = "2026-11-24";
const WED = "2026-11-25";
const SAT = "2026-11-21";

// Monday and Tuesday differ; Saturday is short; Sunday is a day off; Wed/Thu/Fri have NO row.
const HOURS: BranchHours = {
  weekly: [
    { day_of_week: 0, start_time: "09:00:00", end_time: "17:00:00", is_day_off: false }, // Mon
    { day_of_week: 1, start_time: "10:00:00", end_time: "20:00:00", is_day_off: false }, // Tue
    { day_of_week: 5, start_time: "11:00:00", end_time: "15:00:00", is_day_off: false }, // Sat
    { day_of_week: 6, start_time: null, end_time: null, is_day_off: true }, // Sun
  ],
  openTime: "08:00:00",
  closeTime: "12:00:00",
};

// A long time before any date used, so "now" never interferes unless a test sets it.
const LONG_AGO = new Date("2026-01-01T00:00:00Z");

type Params = Parameters<typeof computeSoloSlots>[0];

function run(overrides: Partial<Params> & { dates: string[] }): SoloDay[] {
  return computeSoloSlots({
    rooms: [{ id: "room-1", capacity: 1 }],
    bookings: [],
    therapistWindowRows: null,
    therapistWindowError: false,
    therapistFilter: null,
    durationMinutes: 60,
    genderPreference: "no-preference",
    enableRooms: true,
    therapistCounts: { male: 1, female: 1 },
    closedRanges: [],
    hours: HOURS,
    onlineCapacity: null,
    now: LONG_AGO,
    ...overrides,
  });
}

const starts = (day: SoloDay) => day.slots.map((s) => s.time24);
const offered = (day: SoloDay) => day.slots.filter((s) => s.isAvailable).map((s) => s.time24);

describe("weekday mapping (book-spa: Monday = 0 … Sunday = 6, NOT JS getDay)", () => {
  it("reads Monday's row on a Monday", () => {
    expect(slotRangeForDate(MON, HOURS)).toEqual({ startMin: 540, endMin: 1020 }); // 09:00–17:00
  });

  it("reads Sunday's row (day_of_week 6) on a Sunday: a day off", () => {
    expect(slotRangeForDate(SUN, HOURS)).toBe("day-off");
  });

  it("does not use Monday's row on a Sunday or Sunday's row on a Monday", () => {
    // If the mapping were JS getDay (Sunday = 0), Sunday would get Monday's 09:00–17:00 hours.
    const sun = run({ dates: [SUN] })[0];
    expect(sun.slots).toEqual([]);
    const mon = run({ dates: [MON] })[0];
    expect(mon.slots.length).toBeGreaterThan(0);
  });

  it("maps Saturday to day_of_week 5", () => {
    expect(slotRangeForDate(SAT, HOURS)).toEqual({ startMin: 660, endMin: 900 }); // 11:00–15:00
  });
});

describe("per-day opening hours", () => {
  it("offers different hours on different weekdays", () => {
    const [mon, tue] = run({ dates: [MON, TUE] });
    expect(starts(mon)[0]).toBe("09:00");
    expect(starts(mon).at(-1)).toBe("16:00"); // a 60-minute service must end by 17:00
    expect(starts(tue)[0]).toBe("10:00");
    expect(starts(tue).at(-1)).toBe("19:00"); // …and by 20:00 on Tuesday
  });

  it("shows a day off as closed, not as an empty grid", () => {
    const sun = run({ dates: [SUN] })[0];
    expect(sun.isClosed).toBe(true);
    expect(sun.closedReason).toBe("day-off");
    expect(sun.slots).toEqual([]);
  });

  it("a weekday with NO row falls back to branches.open_time/close_time", () => {
    const wed = run({ dates: [WED] })[0];
    expect(starts(wed)[0]).toBe("08:00");
    expect(starts(wed).at(-1)).toBe("11:00"); // 11:00 + 60 = 12:00 close
    expect(wed.isClosed).toBe(false);
  });

  it("no row AND no open/close time at all → no slots, flagged unknown (never a guessed 10–18)", () => {
    const bare: BranchHours = { weekly: [], openTime: null, closeTime: null };
    const day = run({ dates: [WED], hours: bare })[0];
    expect(day.slots).toEqual([]);
    expect(day.isClosed).toBe(true);
    expect(day.closedReason).toBe("hours-unknown");
    expect(slotRangeForDate(WED, bare)).toBe("unconfigured");
  });

  it("an is_day_off row beats the open/close fallback", () => {
    const hours: BranchHours = {
      weekly: [{ day_of_week: 2, start_time: null, end_time: null, is_day_off: true }], // Wed off
      openTime: "08:00:00",
      closeTime: "12:00:00",
    };
    expect(run({ dates: [WED], hours })[0].closedReason).toBe("day-off");
  });
});

describe("fail closed when the data didn't load", () => {
  it("hours failed to load (null) → every day closed/unknown, nothing offered", () => {
    const days = run({ dates: [MON, TUE], hours: null });
    for (const day of days) {
      expect(day.slots).toEqual([]);
      expect(day.closedReason).toBe("hours-unknown");
    }
  });

  it("closed dates failed to load (null) → nothing offered", () => {
    const day = run({ dates: [MON], closedRanges: null })[0];
    expect(day.slots).toEqual([]);
    expect(day.closedReason).toBe("hours-unknown");
  });
});

describe("closed dates", () => {
  it("a closed date returned by public_get_closed_dates → no slots, shown as closed", () => {
    const day = run({ dates: [TUE], closedRanges: [{ startDate: TUE, endDate: TUE }] })[0];
    expect(day.isClosed).toBe(true);
    expect(day.closedReason).toBe("closed-date");
    expect(day.slots).toEqual([]);
  });

  it("covers every day in a multi-day closure and nothing outside it", () => {
    const days = run({ dates: [MON, TUE, WED], closedRanges: [{ startDate: MON, endDate: TUE }] });
    expect(days.map((d) => d.closedReason)).toEqual(["closed-date", "closed-date", null]);
  });

  it("a closure wins over normal opening hours", () => {
    const day = run({ dates: [MON], closedRanges: [{ startDate: MON, endDate: MON }] })[0];
    expect(offered(day)).toEqual([]);
  });
});

describe("the past, in Asia/Kathmandu (also when the server clock is UTC)", () => {
  it("nepalClock converts an instant to Kathmandu wall-clock, rolling the date over", () => {
    // 20:00 UTC on the 23rd is 01:45 on the 24th in Kathmandu.
    expect(nepalClock(new Date("2026-11-23T20:00:00Z"))).toEqual({ date: "2026-11-24", minutes: 105 });
    // 06:25 UTC is 12:10 the same day.
    expect(nepalClock(new Date("2026-11-23T06:25:00Z"))).toEqual({ date: "2026-11-23", minutes: 730 });
  });

  it("today after closing → no bookable slots", () => {
    // Mon 17:30 Kathmandu (11:45Z); Monday closes at 17:00.
    const day = run({ dates: [MON], now: new Date("2026-11-23T11:45:00Z") })[0];
    expect(offered(day)).toEqual([]);
  });

  it("today mid-day → nothing at or before now, later slots still offered", () => {
    // Mon 12:10 Kathmandu (06:25Z).
    const day = run({ dates: [MON], now: new Date("2026-11-23T06:25:00Z") })[0];
    expect(offered(day)).toEqual(["12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"]);
    expect(day.slots.find((s) => s.time24 === "12:00")?.isPast).toBe(true);
  });

  it("a slot starting exactly now is already past (no lead buffer, like book-spa)", () => {
    const day = run({ dates: [MON], now: new Date("2026-11-23T06:15:00Z") })[0]; // 12:00 Kathmandu
    expect(offered(day)).not.toContain("12:00");
    expect(offered(day)).toContain("12:30");
  });

  it("uses Kathmandu's date, not the UTC date, to decide what 'today' is", () => {
    // 20:00Z on Mon 23 is already Tue 24 in Kathmandu → all of Monday is in the past.
    const [mon, tue] = run({ dates: [MON, TUE], now: new Date("2026-11-23T20:00:00Z") });
    expect(offered(mon)).toEqual([]);
    expect(offered(tue).length).toBeGreaterThan(0); // Tuesday, 01:45 Kathmandu: all of it still ahead
  });

  it("future days are unaffected by the clock", () => {
    const day = run({ dates: [TUE], now: new Date("2026-11-23T06:25:00Z") })[0];
    expect(offered(day)[0]).toBe("10:00");
  });
});

describe("a slot that would end after closing is not offered", () => {
  it("a 90-minute service on a 17:00 close: last start is 15:30", () => {
    const mon = run({ dates: [MON], durationMinutes: 90 })[0];
    expect(starts(mon).at(-1)).toBe("15:30");
    expect(starts(mon)).not.toContain("16:00");
    for (const s of mon.slots) {
      const [h, m] = s.time24.split(":").map(Number);
      expect(h * 60 + m + 90).toBeLessThanOrEqual(17 * 60);
    }
  });

  it("a service longer than the whole day offers nothing", () => {
    const sat = run({ dates: [SAT], durationMinutes: 300 })[0]; // Saturday is only 4h
    expect(sat.slots).toEqual([]);
  });
});

describe("busy staff / room / capacity removes the slot", () => {
  it("a booked room removes every slot it overlaps and leaves the rest", () => {
    const day = run({
      dates: [MON],
      bookings: [
        {
          booking_date: MON,
          start_time: "10:00:00",
          duration_minutes: 60,
          room_id: "room-1",
          therapist_gender: null,
          gender_preference: null,
          counts_as_online_capacity: false,
        },
      ],
    })[0];
    const free = offered(day);
    expect(free).toContain("09:00"); // 09:00–10:00 ends as the booking starts
    expect(free).not.toContain("09:30"); // 09:30–10:30 overlaps
    expect(free).not.toContain("10:00");
    expect(free).not.toContain("10:30");
    expect(free).toContain("11:00");
  });

  it("a second room keeps the slot open", () => {
    const day = run({
      dates: [MON],
      rooms: [
        { id: "room-1", capacity: 1 },
        { id: "room-2", capacity: 1 },
      ],
      bookings: [
        {
          booking_date: MON,
          start_time: "10:00:00",
          duration_minutes: 60,
          room_id: "room-1",
          therapist_gender: null,
          gender_preference: null,
          counts_as_online_capacity: false,
        },
      ],
    })[0];
    expect(offered(day)).toContain("10:00");
  });

  it("a specific therapist who is busy loses the slot", () => {
    const day = run({
      dates: [MON],
      therapistFilter: { therapistId: "t1", eligibleIds: [] },
      therapistWindowRows: [{ therapist_id: "t1", busy_date: MON, start_time: "11:00:00", duration_minutes: 60 }],
    })[0];
    const free = offered(day);
    expect(free).toContain("10:00");
    expect(free).not.toContain("10:30");
    expect(free).not.toContain("11:00");
    expect(free).toContain("12:00");
  });

  it("'any professional' is free while one eligible therapist is, and not when all are busy", () => {
    const busy = (id: string) => ({ therapist_id: id, busy_date: MON, start_time: "11:00:00", duration_minutes: 60 });
    const oneBusy = run({
      dates: [MON],
      therapistFilter: { therapistId: null, eligibleIds: ["t1", "t2"] },
      therapistWindowRows: [busy("t1")],
    })[0];
    expect(offered(oneBusy)).toContain("11:00");
    const allBusy = run({
      dates: [MON],
      therapistFilter: { therapistId: null, eligibleIds: ["t1", "t2"] },
      therapistWindowRows: [busy("t1"), busy("t2")],
    })[0];
    expect(offered(allBusy)).not.toContain("11:00");
  });

  it("a therapist-window read error offers nothing for a therapist-filtered booking", () => {
    const day = run({
      dates: [MON],
      therapistFilter: { therapistId: "t1", eligibleIds: [] },
      therapistWindowError: true,
    })[0];
    expect(offered(day)).toEqual([]);
  });

  it("the branch's online capacity removes a full slot", () => {
    const day = run({
      dates: [MON],
      onlineCapacity: 1,
      bookings: [
        {
          booking_date: MON,
          start_time: "14:00:00",
          duration_minutes: 60,
          room_id: null,
          therapist_gender: null,
          gender_preference: null,
          counts_as_online_capacity: true,
        },
      ],
      enableRooms: false,
    })[0];
    expect(offered(day)).not.toContain("14:00");
    expect(offered(day)).toContain("15:00");
  });
});

describe("one branch vs another (hours are per branch)", () => {
  const branchA: BranchHours = {
    weekly: [{ day_of_week: 0, start_time: "09:00:00", end_time: "17:00:00", is_day_off: false }],
    openTime: null,
    closeTime: null,
  };
  const branchB: BranchHours = {
    weekly: [{ day_of_week: 0, start_time: "12:00:00", end_time: "14:00:00", is_day_off: false }],
    openTime: null,
    closeTime: null,
  };

  it("the same date gives each branch its own window", () => {
    const a = run({ dates: [MON], hours: branchA })[0];
    const b = run({ dates: [MON], hours: branchB })[0];
    expect(starts(a)[0]).toBe("09:00");
    expect(starts(b)).toEqual(["12:00", "12:30", "13:00"]);
  });
});

import { branchBookability, weeklyHoursRows } from "./engine-availability";

describe("the studio page's opening hours come from the same rule as the drawer", () => {
  it("lists each weekday with its own hours and shows a day off as Closed", () => {
    const rows = weeklyHoursRows(HOURS);
    expect(rows).toEqual([
      { day: "Mon", open: "9:00 am – 5:00 pm" },
      { day: "Tue", open: "10:00 am – 8:00 pm" },
      { day: "Wed", open: "8:00 am – 12:00 pm" }, // no row → open/close fallback
      { day: "Thu", open: "8:00 am – 12:00 pm" },
      { day: "Fri", open: "8:00 am – 12:00 pm" },
      { day: "Sat", open: "11:00 am – 3:00 pm" },
      { day: "Sun", open: "Closed" },
    ]);
  });

  it("every row agrees with the drawer's own window for that weekday", () => {
    const rows = weeklyHoursRows(HOURS);
    const dates = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
    dates.forEach((date, i) => {
      const day = run({ dates: [date], durationMinutes: 30 })[0];
      expect(day.isClosed).toBe(rows[i].open === "Closed");
    });
  });

  it("seven identical days collapse to one Every day row", () => {
    const flat: BranchHours = { weekly: [], openTime: "09:00:00", closeTime: "21:00:00" };
    expect(weeklyHoursRows(flat)).toEqual([{ day: "Every day", open: "9:00 am – 9:00 pm" }]);
  });

  it("no hours anywhere reads Hours not set, never a guessed range", () => {
    expect(weeklyHoursRows({ weekly: [], openTime: null, closeTime: null })).toEqual([{ day: "Every day", open: "Hours not set" }]);
  });

  it("formats noon and midnight-adjacent times correctly", () => {
    const h: BranchHours = { weekly: [], openTime: "00:30:00", closeTime: "12:00:00" };
    expect(weeklyHoursRows(h)[0].open).toBe("12:30 am – 12:00 pm");
  });
});

describe("branchBookability (location step: which branches look choosable)", () => {
  const allOff: BranchHours = {
    weekly: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, start_time: null, end_time: null, is_day_off: true })),
    openTime: "09:00:00",
    closeTime: "21:00:00",
  };

  it("all seven days off → not bookable", () => {
    expect(branchBookability({ hours: allOff, roomCount: 5, enableRooms: true })).toEqual({ bookable: false, reason: "all-days-off" });
  });

  it("rooms on but zero active rooms → not bookable", () => {
    expect(branchBookability({ hours: HOURS, roomCount: 0, enableRooms: true })).toEqual({ bookable: false, reason: "no-rooms" });
  });

  it("zero rooms is fine when the industry doesn't use rooms", () => {
    expect(branchBookability({ hours: HOURS, roomCount: 0, enableRooms: false })).toEqual({ bookable: true });
  });

  it("no hours anywhere → not bookable (matches the drawer offering nothing)", () => {
    expect(branchBookability({ hours: { weekly: [], openTime: null, closeTime: null }, roomCount: 3, enableRooms: true })).toEqual({
      bookable: false,
      reason: "hours-not-set",
    });
  });

  it("one open day is enough", () => {
    expect(branchBookability({ hours: HOURS, roomCount: 2, enableRooms: true })).toEqual({ bookable: true });
  });

  it("unknown hours or room count never block a branch (the drawer will say it can't load)", () => {
    expect(branchBookability({ hours: null, roomCount: null, enableRooms: true })).toEqual({ bookable: true });
  });
});
