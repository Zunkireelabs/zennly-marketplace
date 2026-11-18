/**
 * Ported, not reimplemented, from book-spa's own availability math:
 *   - src/pages/customer-booking-flow/utils/availability.js (buildOccupancy, Nepal-time helpers,
 *     the 10am-6pm slot window)
 *   - src/pages/provider-profile-flow/utils/therapistAvailability.js (buildTherapistOccupancy,
 *     isTherapistFree, anyProfessionalFree)
 *   - src/pages/customer-booking-flow/components/DateTimeSelection.jsx's `computedDays` useMemo
 *     (the actual per-slot decision: room capacity + gender headcount + therapist + branch cap)
 *
 * Deliberately not approximated from the RPC shapes — read the real frontend code that consumes
 * public_check_branch_bookings_range / public_check_therapist_bookings_range and ported its exact
 * logic, including two details easy to get wrong by "reasonable" reimplementation instead of
 * reading the source:
 *
 * 1. The slot window is a FIXED 10:00-18:00 (START_HOUR/END_HOUR), not derived from the branch's
 *    own open_time/close_time. book-spa's DateTimeSelection.jsx never reads branch hours at all —
 *    it's a flat global window regardless of org. Using the branch's real hours instead would be
 *    the "obviously more correct" choice and would NOT match what app.zennly.io actually shows.
 * 2. "Past" cutoff is `start <= nowMinutes` with NO lead-time buffer, in Asia/Kathmandu time
 *    specifically (getNepalNow/getNepalToday) — not the marketplace's own old simulator, which
 *    added a 60-minute buffer, and not the browser's local timezone.
 *
 * Party size: buildOccupancy/buildTherapistOccupancy/isTherapistFree are genuinely
 * party-size-agnostic — they just bucket raw booking rows into 30-min-slot maps, identical
 * whether a group feature ever calls them. computeSoloSlots below is NOT that — it is book-spa's
 * SOLO decision algorithm specifically (one gender-preference check against aggregate headcount,
 * no particular therapist identity involved unless therapistFilter is set). book-spa's group
 * flow (groupAvailability.js's allPeopleFitSlot) reuses these same three primitives but runs a
 * genuinely different decision shape: a sequential per-person claim simulation against specific
 * therapist identities, with NO gender-preference concept at all. The two are not the same
 * formula parameterized by party size — unifying them would either drop solo's gender-preference
 * matching or require inventing a gender-preference mode group never had. Built so a future
 * group decision function can reuse buildOccupancy/buildTherapistOccupancy unchanged; did not
 * attempt to unify the decision logic itself, since that wasn't this phase's job and doing it
 * wrong would be worse than not doing it.
 */

export const START_HOUR = 10;
export const END_HOUR = 18;
const SLOT_MINUTES = 30;

export function getNepalNow(): Date {
  const now = new Date();
  const nepalTime = now.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" });
  return new Date(nepalTime);
}

export function getNepalToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
}

export function isDateInRanges(dateStr: string, ranges: { startDate: string; endDate: string }[]): boolean {
  return (ranges || []).some((r) => dateStr >= r.startDate && dateStr <= r.endDate);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime24(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesToTime12(mins: number): string {
  const d = new Date();
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

type RawBooking = {
  booking_date: string;
  start_time: string;
  duration_minutes: number;
  room_id: string | null;
  therapist_gender: string | null;
  gender_preference: string | null;
  counts_as_online_capacity: boolean;
};

type Occupancy = {
  byRoom: Record<string, Record<string, Map<number, number>>>;
  byGender: Record<string, Map<number, { male: number; female: number }>>;
  byBranch: Record<string, Map<number, number>>;
};

/** Ported 1:1 from availability.js's buildOccupancy. Party-size-agnostic: just buckets raw rows. */
export function buildOccupancy(bookings: RawBooking[]): Occupancy {
  const byRoom: Occupancy["byRoom"] = {};
  const byGender: Occupancy["byGender"] = {};
  const byBranch: Occupancy["byBranch"] = {};

  for (const b of bookings || []) {
    const date = b.booking_date;
    const startMin = timeToMinutes(b.start_time?.slice(0, 5) || "00:00");
    const duration = b.duration_minutes || 60;
    const endMin = startMin + duration;
    const gender = (b.therapist_gender || b.gender_preference)?.toLowerCase();
    const gridStart = Math.floor(startMin / SLOT_MINUTES) * SLOT_MINUTES;

    for (let slotMin = gridStart; slotMin < endMin; slotMin += SLOT_MINUTES) {
      if (b.room_id) {
        byRoom[date] = byRoom[date] || {};
        byRoom[date][b.room_id] = byRoom[date][b.room_id] || new Map();
        const map = byRoom[date][b.room_id];
        map.set(slotMin, (map.get(slotMin) || 0) + 1);
      }

      if (gender === "male" || gender === "female") {
        byGender[date] = byGender[date] || new Map();
        const entry = byGender[date].get(slotMin) || { male: 0, female: 0 };
        entry[gender]++;
        byGender[date].set(slotMin, entry);
      }

      if (b.counts_as_online_capacity) {
        byBranch[date] = byBranch[date] || new Map();
        const map = byBranch[date];
        map.set(slotMin, (map.get(slotMin) || 0) + 1);
      }
    }
  }

  return { byRoom, byGender, byBranch };
}

type TherapistBusyRow = { therapist_id: string | null; busy_date: string; start_time: string; duration_minutes: number };

type TherapistOccupancy = {
  byTherapist: Record<string, Record<string, Map<number, number>>>;
  unassigned: Record<string, Map<number, number>>;
};

/** Ported 1:1 from therapistAvailability.js's buildTherapistOccupancy. */
export function buildTherapistOccupancy(rows: TherapistBusyRow[]): TherapistOccupancy {
  const byTherapist: TherapistOccupancy["byTherapist"] = {};
  const unassigned: TherapistOccupancy["unassigned"] = {};

  for (const row of rows || []) {
    const date = row.busy_date;
    const startMin = timeToMinutes(row.start_time || "00:00");
    const duration = row.duration_minutes || 60;
    const endMin = startMin + duration;
    const gridStart = Math.floor(startMin / SLOT_MINUTES) * SLOT_MINUTES;

    for (let slotMin = gridStart; slotMin < endMin; slotMin += SLOT_MINUTES) {
      if (row.therapist_id) {
        byTherapist[date] = byTherapist[date] || {};
        byTherapist[date][row.therapist_id] = byTherapist[date][row.therapist_id] || new Map();
        const map = byTherapist[date][row.therapist_id];
        map.set(slotMin, (map.get(slotMin) || 0) + 1);
      } else {
        unassigned[date] = unassigned[date] || new Map();
        unassigned[date].set(slotMin, (unassigned[date].get(slotMin) || 0) + 1);
      }
    }
  }

  return { byTherapist, unassigned };
}

function spanSlots(startMin: number, durationMinutes: number): number[] {
  const endMin = startMin + durationMinutes;
  const gridStart = Math.floor(startMin / SLOT_MINUTES) * SLOT_MINUTES;
  const slots: number[] = [];
  for (let slotMin = gridStart; slotMin < endMin; slotMin += SLOT_MINUTES) slots.push(slotMin);
  return slots;
}

/** Ported 1:1 from therapistAvailability.js. */
export function isTherapistFree(
  occupancy: TherapistOccupancy,
  therapistId: string,
  date: string,
  startMin: number,
  durationMinutes: number
): boolean {
  const perSlot = occupancy.byTherapist[date]?.[therapistId];
  if (!perSlot) return true;
  return spanSlots(startMin, durationMinutes).every((slotMin) => !(perSlot.get(slotMin) ?? 0 > 0));
}

/** Ported 1:1 from therapistAvailability.js. */
export function anyProfessionalFree(
  occupancy: TherapistOccupancy,
  eligibleTherapistIds: string[],
  date: string,
  startMin: number,
  durationMinutes: number
): boolean {
  if (!eligibleTherapistIds || eligibleTherapistIds.length === 0) return false;
  return spanSlots(startMin, durationMinutes).every((slotMin) => {
    const freeCount = eligibleTherapistIds.filter(
      (id) => !((occupancy.byTherapist[date]?.[id]?.get(slotMin) ?? 0) > 0)
    ).length;
    const unassignedCount = occupancy.unassigned[date]?.get(slotMin) || 0;
    return freeCount > unassignedCount;
  });
}

export type SoloSlot = { time24: string; time12: string; maleAvailable: boolean; femaleAvailable: boolean; isPast: boolean; isAvailable: boolean };
export type SoloDay = { date: string; slots: SoloSlot[]; isClosed: boolean };

export type TherapistFilter = { therapistId: string | null; eligibleIds: string[] } | null;

/**
 * Faithful port of DateTimeSelection.jsx's `computedDays`, for one person / one service
 * selection (the marketplace drawer has no group UI yet). Every input here is the same input
 * book-spa's own component takes, so there is nowhere left for a silent reinterpretation to hide.
 */
export function computeSoloSlots(params: {
  dates: string[];
  rooms: { id: string; capacity: number }[];
  bookings: RawBooking[];
  therapistWindowRows: TherapistBusyRow[] | null;
  therapistWindowError: boolean;
  therapistFilter: TherapistFilter;
  durationMinutes: number;
  genderPreference: "male" | "female" | "no-preference";
  enableRooms: boolean;
  therapistCounts: { male: number; female: number };
  closedRanges: { startDate: string; endDate: string }[];
  onlineCapacity: number | null;
}): SoloDay[] {
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
  } = params;

  const { byRoom, byGender, byBranch } = buildOccupancy(bookings);
  const therapistOccupancy = therapistFilter ? buildTherapistOccupancy(therapistWindowRows || []) : null;
  // Mirrors book-spa exactly: a specific-therapist booking isn't "unassigned" online capacity,
  // so the branch cap only applies when no particular therapist is being reserved.
  const onlineCapacity = therapistFilter?.therapistId ? null : params.onlineCapacity;

  const nepalToday = getNepalToday();
  const nepalNow = getNepalNow();
  const nowMinutes = nepalNow.getHours() * 60 + nepalNow.getMinutes();

  return dates.map((date) => {
    const isToday = date === nepalToday;
    const isClosed = isDateInRanges(date, closedRanges);
    const slots: SoloSlot[] = [];

    for (let start = START_HOUR * 60; start + duration <= END_HOUR * 60; start += 30) {
      const isPast = isToday && start <= nowMinutes;

      let roomAvailable = true;
      if (enableRooms) {
        roomAvailable = rooms.some((room) => {
          for (let offset = 0; offset < duration; offset += 30) {
            const occupied = byRoom[date]?.[room.id]?.get(start + offset) || 0;
            if (occupied >= room.capacity) return false;
          }
          return true;
        });
      }

      let maleAvailable = true;
      let femaleAvailable = true;
      for (let offset = 0; offset < duration; offset += 30) {
        const booked = byGender[date]?.get(start + offset) || { male: 0, female: 0 };
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
            ? isTherapistFree(therapistOccupancy, therapistFilter.therapistId, date, start, duration)
            : anyProfessionalFree(therapistOccupancy, therapistFilter.eligibleIds || [], date, start, duration);
        }
      }

      let branchCapacityOk = true;
      if (onlineCapacity !== null) {
        for (let offset = 0; offset < duration; offset += 30) {
          if ((byBranch[date]?.get(start + offset) || 0) >= onlineCapacity) {
            branchCapacityOk = false;
            break;
          }
        }
      }

      const isAvailable = !isPast && !isClosed && roomAvailable && genderOk && therapistOk && branchCapacityOk;

      slots.push({
        time24: minutesToTime24(start),
        time12: minutesToTime12(start),
        maleAvailable,
        femaleAvailable,
        isPast,
        isAvailable,
      });
    }

    return { date, slots, isClosed };
  });
}
