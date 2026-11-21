/**
 * Differential test: book-spa's own shipped availability functions vs this repo's
 * computeSoloSlots port (src/lib/booking/engine-availability.ts), run on identical
 * synthetic inputs, asserting byte-identical output.
 *
 * This is NOT a reimplementation check — it imports book-spa's actual exported functions
 * (buildOccupancy, buildTherapistOccupancy, isTherapistFree, anyProfessionalFree, the Nepal-time
 * helpers) from the book-spa-zennly-connectors worktree by relative path, and reconstructs only
 * the computedDays LOOP from DateTimeSelection.jsx around them (book-spa doesn't export that loop
 * as a standalone function — it's inline in the React component — so this is the one piece that
 * has to be copied rather than imported; everything it calls is the real thing).
 *
 * Inputs are synthetic, not fetched from a live DB: a regression test that depends on today's
 * staging data would fail the day someone edits a booking, for reasons that have nothing to do
 * with whether the ported algorithm still agrees with book-spa's. Each case below deliberately
 * exercises one piece of the decision (room capacity, gender headcount, branch online-capacity,
 * per-therapist filtering) rather than relying on a quiet "nothing happened to differ on" pass.
 *
 * Skips (exit 0) rather than fails when the book-spa-zennly-connectors worktree isn't checked out
 * as a sibling of this repo — a differential test against a repo you don't have isn't something a
 * colleague's machine should fail CI over.
 */
import path from "path";
import { pathToFileURL } from "url";
import {
  computeSoloSlots,
  type SoloDay,
} from "../src/lib/booking/engine-availability";

const BOOK_SPA_DIR = path.resolve(__dirname, "../../book-spa-zennly-connectors");

type TestBooking = {
  booking_date: string;
  start_time: string;
  duration_minutes: number;
  room_id: string | null;
  therapist_gender: string | null;
  gender_preference: string | null;
  counts_as_online_capacity: boolean;
};

type TestTherapistBusyRow = { therapist_id: string | null; busy_date: string; start_time: string; duration_minutes: number };

type BookSpaAvailabilityModule = {
  START_HOUR: number;
  END_HOUR: number;
  getNepalNow: () => Date;
  getNepalToday: () => string;
  isDateInRanges: (dateStr: string, ranges: { startDate: string; endDate: string }[]) => boolean;
  minutesToTime24: (mins: number) => string;
  minutesToTime12: (mins: number) => string;
  buildOccupancy: (bookings: unknown[]) => {
    byRoom: Record<string, Record<string, Map<number, number>>>;
    byGender: Record<string, Map<number, { male: number; female: number }>>;
    byBranch: Record<string, Map<number, number>>;
  };
};

type BookSpaTherapistModule = {
  buildTherapistOccupancy: (rows: unknown[]) => {
    byTherapist: Record<string, Record<string, Map<number, number>>>;
    unassigned: Record<string, Map<number, number>>;
  };
  isTherapistFree: (occupancy: unknown, therapistId: string, date: string, startMin: number, durationMinutes: number) => boolean;
  anyProfessionalFree: (occupancy: unknown, eligibleIds: string[], date: string, startMin: number, durationMinutes: number) => boolean;
};

async function loadBookSpaModules(): Promise<{ availability: BookSpaAvailabilityModule; therapist: BookSpaTherapistModule } | null> {
  try {
    const availability = (await import(
      pathToFileURL(path.join(BOOK_SPA_DIR, "src/pages/customer-booking-flow/utils/availability.js")).href
    )) as BookSpaAvailabilityModule;
    const therapist = (await import(
      pathToFileURL(path.join(BOOK_SPA_DIR, "src/pages/provider-profile-flow/utils/therapistAvailability.js")).href
    )) as BookSpaTherapistModule;
    return { availability, therapist };
  } catch {
    return null;
  }
}

// Faithful copy of DateTimeSelection.jsx's computedDays loop — the one piece book-spa doesn't
// export standalone. Every function it CALLS (buildOccupancy, buildTherapistOccupancy,
// isTherapistFree, anyProfessionalFree, the Nepal-time helpers) is book-spa's real import, not a
// reimplementation.
function bookSpaComputedDays(
  mods: { availability: BookSpaAvailabilityModule; therapist: BookSpaTherapistModule },
  params: {
    dates: string[];
    rooms: { id: string; capacity: number }[];
    bookings: TestBooking[];
    therapistWindowRows: TestTherapistBusyRow[] | null;
    therapistWindowError: boolean;
    therapistFilter: { therapistId: string | null; eligibleIds: string[] } | null;
    durationMinutes: number;
    genderPreference: "male" | "female" | "no-preference";
    enableRooms: boolean;
    therapistCounts: { male: number; female: number };
    closedRanges: { startDate: string; endDate: string }[];
    onlineCapacity: number | null;
  }
): SoloDay[] {
  const { availability, therapist } = mods;
  const {
    dates,
    rooms,
    bookings,
    therapistWindowRows,
    therapistWindowError,
    therapistFilter,
    durationMinutes: duration,
    genderPreference,
    enableRooms,
    therapistCounts,
    closedRanges,
    onlineCapacity: onlineCapacityRaw,
  } = params;

  const { byRoom, byGender, byBranch } = availability.buildOccupancy(bookings);
  const therapistOccupancy = therapistFilter ? therapist.buildTherapistOccupancy(therapistWindowRows || []) : null;
  const onlineCapacity = therapistFilter?.therapistId ? null : onlineCapacityRaw ?? null;
  const nepalToday = availability.getNepalToday();
  const nepalNow = availability.getNepalNow();
  const nowMinutes = nepalNow.getHours() * 60 + nepalNow.getMinutes();

  return dates.map((dateStr) => {
    const isToday = dateStr === nepalToday;
    const isClosed = availability.isDateInRanges(dateStr, closedRanges);
    const slots: SoloDay["slots"] = [];

    for (let start = availability.START_HOUR * 60; start + duration <= availability.END_HOUR * 60; start += 30) {
      const isPast = isToday && start <= nowMinutes;

      let roomAvailable = true;
      if (enableRooms) {
        roomAvailable = rooms.some((room) => {
          for (let offset = 0; offset < duration; offset += 30) {
            const occupied = byRoom[dateStr]?.[room.id]?.get(start + offset) || 0;
            if (occupied >= room.capacity) return false;
          }
          return true;
        });
      }

      let maleAvailable = true;
      let femaleAvailable = true;
      for (let offset = 0; offset < duration; offset += 30) {
        const booked = byGender[dateStr]?.get(start + offset) || { male: 0, female: 0 };
        if (therapistCounts.male - booked.male <= 0) maleAvailable = false;
        if (therapistCounts.female - booked.female <= 0) femaleAvailable = false;
      }

      const genderOk = therapistFilter
        ? true
        : (genderPreference === "male" && maleAvailable) ||
          (genderPreference === "female" && femaleAvailable) ||
          (genderPreference === "no-preference" && (maleAvailable || femaleAvailable));

      let therapistOk = true;
      if (therapistFilter) {
        if (therapistWindowError) {
          therapistOk = false;
        } else if (therapistOccupancy) {
          therapistOk = therapistFilter.therapistId
            ? therapist.isTherapistFree(therapistOccupancy, therapistFilter.therapistId, dateStr, start, duration)
            : therapist.anyProfessionalFree(therapistOccupancy, therapistFilter.eligibleIds || [], dateStr, start, duration);
        }
      }

      let branchCapacityOk = true;
      if (onlineCapacity !== null) {
        for (let offset = 0; offset < duration; offset += 30) {
          if ((byBranch[dateStr]?.get(start + offset) || 0) >= onlineCapacity) {
            branchCapacityOk = false;
            break;
          }
        }
      }

      const isAvailable = !isPast && !isClosed && roomAvailable && genderOk && therapistOk && branchCapacityOk;

      slots.push({
        time24: availability.minutesToTime24(start),
        time12: availability.minutesToTime12(start),
        maleAvailable,
        femaleAvailable,
        isPast,
        isAvailable,
      });
    }

    return { date: dateStr, slots, isClosed };
  });
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

type Case = {
  name: string;
  params: Parameters<typeof bookSpaComputedDays>[1];
  expect?: (days: SoloDay[]) => string | null; // returns an error string, or null if OK
};

function buildCases(): Case[] {
  const dates = [dateOffset(0), dateOffset(1), dateOffset(2), dateOffset(3), dateOffset(4)];
  const rooms = [
    { id: "room-1", capacity: 1 },
    { id: "room-2", capacity: 2 },
  ];

  const base = {
    dates,
    rooms,
    therapistWindowRows: null,
    therapistWindowError: false,
    therapistFilter: null,
    durationMinutes: 90,
    genderPreference: "no-preference" as const,
    enableRooms: true,
    therapistCounts: { male: 3, female: 5 },
    closedRanges: [],
    onlineCapacity: 2 as number | null,
  };

  return [
    {
      name: "empty bookings — baseline, every slot open",
      params: { ...base, bookings: [] },
      expect: (days) => {
        const allOpen = days.every((d) => !d.isClosed && d.slots.every((s) => s.isPast || s.isAvailable));
        return allOpen ? null : "expected every non-past slot open with no bookings";
      },
    },
    {
      name: "room capacity exhausted — both rooms fully booked at 11:00 on dates[1]",
      params: {
        ...base,
        bookings: [
          { booking_date: dates[1], start_time: "11:00:00", duration_minutes: 90, room_id: "room-1", therapist_gender: "male", gender_preference: null, counts_as_online_capacity: false },
          { booking_date: dates[1], start_time: "11:00:00", duration_minutes: 90, room_id: "room-2", therapist_gender: "male", gender_preference: null, counts_as_online_capacity: false },
          { booking_date: dates[1], start_time: "11:00:00", duration_minutes: 90, room_id: "room-2", therapist_gender: "female", gender_preference: null, counts_as_online_capacity: false },
        ],
      },
      expect: (days) => {
        const slot = days[1].slots.find((s) => s.time24 === "11:00");
        return slot && !slot.isAvailable ? null : "expected 11:00 on dates[1] unavailable (both rooms full)";
      },
    },
    {
      name: "gender headcount exhausted — 3 male bookings exactly exhausts male capacity (3) at 14:00 on dates[2]",
      params: {
        ...base,
        genderPreference: "male",
        bookings: Array.from({ length: 3 }, () => ({
          booking_date: dates[2],
          start_time: "14:00:00",
          duration_minutes: 90,
          room_id: null,
          therapist_gender: "male",
          gender_preference: null,
          counts_as_online_capacity: false,
        })),
      },
      expect: (days) => {
        const slot = days[2].slots.find((s) => s.time24 === "14:00");
        return slot && !slot.maleAvailable && !slot.isAvailable ? null : "expected 14:00 on dates[2] male-unavailable (headcount exhausted)";
      },
    },
    {
      name: "branch online-capacity exhausted — 2 unassigned bookings fill cap (2) at 16:00 on dates[3]",
      params: {
        ...base,
        bookings: Array.from({ length: 2 }, () => ({
          booking_date: dates[3],
          start_time: "16:00:00",
          duration_minutes: 90,
          room_id: null,
          therapist_gender: null,
          gender_preference: "female",
          counts_as_online_capacity: true,
        })),
      },
      expect: (days) => {
        const slot = days[3].slots.find((s) => s.time24 === "16:00");
        return slot && !slot.isAvailable ? null : "expected 16:00 on dates[3] unavailable (branch online-capacity exhausted)";
      },
    },
    {
      name: "closed date — dates[4] fully blocked",
      params: {
        ...base,
        bookings: [],
        closedRanges: [{ startDate: dates[4], endDate: dates[4] }],
      },
      expect: (days) => (days[4].isClosed ? null : "expected dates[4] closed"),
    },
    {
      name: "specific-therapist filter — booked therapist is excluded at the busy slot",
      params: {
        ...base,
        bookings: [],
        therapistFilter: { therapistId: "therapist-1", eligibleIds: [] },
        therapistWindowRows: [
          { therapist_id: "therapist-1", busy_date: dates[1], start_time: "11:00:00", duration_minutes: 90 },
        ],
      },
      expect: (days) => {
        const slot = days[1].slots.find((s) => s.time24 === "11:00");
        return slot && !slot.isAvailable ? null : "expected 11:00 on dates[1] unavailable (filtered therapist is busy)";
      },
    },
    {
      name: "any-professional filter — one eligible therapist, busy; no unassigned slack",
      params: {
        ...base,
        bookings: [],
        therapistFilter: { therapistId: null, eligibleIds: ["therapist-1"] },
        therapistWindowRows: [
          { therapist_id: "therapist-1", busy_date: dates[1], start_time: "11:00:00", duration_minutes: 90 },
        ],
      },
      expect: (days) => {
        const slot = days[1].slots.find((s) => s.time24 === "11:00");
        return slot && !slot.isAvailable ? null : "expected 11:00 on dates[1] unavailable (only eligible therapist is busy)";
      },
    },
    {
      name: "therapist window fetch error — treated as unavailable, not silently free",
      params: {
        ...base,
        bookings: [],
        therapistFilter: { therapistId: "therapist-1", eligibleIds: [] },
        therapistWindowError: true,
      },
      expect: (days) => {
        const anyAvailable = days.some((d) => d.slots.some((s) => s.isAvailable));
        return anyAvailable ? "expected every slot unavailable when therapistWindowError is set" : null;
      },
    },
  ];
}

async function main() {
  const mods = await loadBookSpaModules();
  if (!mods) {
    console.log(
      `SKIP: book-spa-zennly-connectors not found at ${BOOK_SPA_DIR} — this differential test needs that worktree checked out as a sibling of this repo. Not a failure.`
    );
    process.exit(0);
  }

  const cases = buildCases();
  let failed = 0;

  for (const c of cases) {
    const mine = computeSoloSlots(c.params);
    const theirs = bookSpaComputedDays(mods, c.params);

    const mineStr = JSON.stringify(mine);
    const theirsStr = JSON.stringify(theirs);

    if (mineStr !== theirsStr) {
      failed++;
      console.error(`FAIL: ${c.name}`);
      for (let i = 0; i < mine.length; i++) {
        const a = JSON.stringify(mine[i]);
        const b = JSON.stringify(theirs[i]);
        if (a !== b) {
          console.error(`  date ${mine[i].date} diverged:`);
          console.error(`    computeSoloSlots: ${a}`);
          console.error(`    book-spa:         ${b}`);
        }
      }
      continue;
    }

    if (c.expect) {
      const err = c.expect(mine);
      if (err) {
        failed++;
        console.error(`FAIL: ${c.name} — outputs matched each other but not the expectation: ${err}`);
        continue;
      }
    }

    console.log(`PASS: ${c.name}`);
  }

  if (failed > 0) {
    console.error(`\n${failed}/${cases.length} case(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${cases.length} cases: computeSoloSlots matches book-spa's own functions bit-for-bit.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
