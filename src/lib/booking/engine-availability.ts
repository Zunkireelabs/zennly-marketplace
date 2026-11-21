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
 * party-size-agnostic — they just bucket raw booking rows into 30-min-slot maps. computeSoloSlots
 * below is book-spa's SOLO decision algorithm specifically (one gender-preference check against
 * aggregate headcount), and it is what the drawer calls, because it is what localhost:4028/book/
 * <org> (the actual comparison target for verification) itself uses for a single-customer
 * booking.
 *
 * Group (party size > 1) is deliberately NOT ported here, after an earlier pass in this same
 * file did port groupAvailability.js's allPeopleFitSlot and was then reverted. Two reasons,
 * from book-spa's own design review: porting solo duplicates logic that already exists
 * client-side on both ends of the real app (book-spa computes it in JS today, DB as backstop —
 * not a new weakness). Porting group would NOT be that: groupAvailability.js has no marketplace
 * counterpart yet, so a port creates a second JS implementation of an algorithm about to exist
 * in two places for the first time — and the review found allPeopleFitSlot itself has a real
 * gap (enforces room + branch-online-capacity per slot, but never checks the gender-headcount
 * constraint solo's buildOccupancy tracks), so porting it would have carried that gap along.
 * Group slots will instead come from a read-only book-spa RPC (public_compute_group_slots or
 * similar) that computes this once, correctly, including the gender constraint. The data shape
 * here stays party-size-ready for that: nothing above assumes a single person.
 */

const SLOT_MINUTES = 30;

/** One row of book-spa's branch_working_hours (anon-readable). day_of_week: Monday = 0 … Sunday = 6. */
export type WeeklyHoursRow = {
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
};

/** A branch's own hours: weekly rows exactly as stored, plus branches.open_time/close_time as fallback. */
export type BranchHours = {
  weekly: WeeklyHoursRow[];
  openTime: string | null;
  closeTime: string | null;
};

/**
 * Wall-clock date and minutes-since-midnight in Asia/Kathmandu for an instant. Built from Intl
 * parts so it gives the same answer whatever the server's own timezone is (UTC included) —
 * `new Date(toLocaleString(...))` re-parses in the local zone and is not safe for that.
 */
export function nepalClock(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function getNepalToday(now: Date = new Date()): string {
  return nepalClock(now).date;
}

/**
 * Online slot range for one calendar date, from the branch's own hours — mirrors book-spa's
 * slotRangeForDate, with one deliberate difference. "day-off" = a row says closed (no slots).
 * A weekday with no row falls back to branches.open_time/close_time. With NO row and NO
 * open/close time at all, book-spa falls back to a legacy 10:00–18:00; we return "unconfigured"
 * instead and offer nothing, so we never show a time the server may refuse (confirm with bookX).
 */
export function slotRangeForDate(
  dateStr: string,
  hours: BranchHours
): { startMin: number; endMin: number } | "day-off" | "unconfigured" {
  // Calendar-date weekday, independent of any timezone: Date.UTC at midnight, read back in UTC.
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const row = hours.weekly.find((r) => r.day_of_week === dow);
  if (row) {
    if (row.is_day_off || !row.start_time || !row.end_time) return "day-off";
    return { startMin: timeToMinutes(row.start_time), endMin: timeToMinutes(row.end_time) };
  }
  if (hours.openTime && hours.closeTime) {
    return { startMin: timeToMinutes(hours.openTime), endMin: timeToMinutes(hours.closeTime) };
  }
  return "unconfigured";
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
/**
 * Why a day has no slots at all, so the UI can say "closed" instead of showing an empty grid:
 * "closed-date" = a manual closure, "day-off" = the branch's weekly hours say it's shut,
 * "hours-unknown" = hours or closures couldn't be loaded, so we refuse to guess (never fall
 * back to a default range that might offer a time the studio can't honour).
 */
export type ClosedReason = "closed-date" | "day-off" | "hours-unknown";
export type SoloDay = { date: string; slots: SoloSlot[]; isClosed: boolean; closedReason: ClosedReason | null };

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
  /** null = closed dates couldn't be loaded (fail closed). */
  closedRanges: { startDate: string; endDate: string }[] | null;
  /** null = the branch's hours couldn't be loaded (fail closed). */
  hours: BranchHours | null;
  onlineCapacity: number | null;
  /** The instant to treat as "now". Defaults to the real clock; injectable for tests. */
  now?: Date;
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

  const { date: nepalToday, minutes: nowMinutes } = nepalClock(params.now);
  const hours = params.hours;

  return dates.map((date) => {
    const isToday = date === nepalToday;
    const slots: SoloSlot[] = [];

    if (!hours || !closedRanges) return { date, slots, isClosed: true, closedReason: "hours-unknown" };
    if (isDateInRanges(date, closedRanges)) return { date, slots, isClosed: true, closedReason: "closed-date" };
    const range = slotRangeForDate(date, hours);
    if (range === "unconfigured") return { date, slots, isClosed: true, closedReason: "hours-unknown" };
    if (range === "day-off") return { date, slots, isClosed: true, closedReason: "day-off" };
    const isClosed = false;

    // A slot is offered only if the whole service fits before closing (start + duration <= close).
    for (let start = range.startMin; start + duration <= range.endMin; start += 30) {
      // A whole date before Kathmandu's today is past too (e.g. a visitor abroad whose own "today" lags).
      const isPast = date < nepalToday || (isToday && start <= nowMinutes);

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

    return { date, slots, isClosed, closedReason: null };
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Monday = 0, like branch_working_hours
const REFERENCE_MONDAY = "2026-11-23"; // any Monday: slotRangeForDate only reads the weekday

function time12(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/**
 * The studio page's opening-hours rows for one branch, derived with the SAME rule the drawer uses
 * (slotRangeForDate), so the page can never show hours the drawer won't honour. A day off reads
 * "Closed"; a day with no hours anywhere reads "Hours not set". Seven identical days collapse to
 * a single "Every day" row.
 */
export function weeklyHoursRows(hours: BranchHours): { day: string; open: string }[] {
  const rows = DAY_LABELS.map((day, i) => {
    const [y, m, d] = REFERENCE_MONDAY.split("-").map(Number);
    const sample = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    const range = slotRangeForDate(sample, hours);
    const open =
      range === "day-off" ? "Closed" : range === "unconfigured" ? "Hours not set" : `${time12(range.startMin)} – ${time12(range.endMin)}`;
    return { day, open };
  });
  return rows.every((r) => r.open === rows[0].open) ? [{ day: "Every day", open: rows[0].open }] : rows;
}

export type Bookability =
  | { bookable: true }
  | { bookable: false; reason: "all-days-off" | "hours-not-set" | "no-rooms" };

/**
 * Whether a branch can take online bookings at all, from data we already read cheaply. Unknown
 * hours (null) are NOT treated as closed: the drawer will say it can't load times instead.
 * Staff aren't checked here (that needs a per-service read); a branch can pass this and still
 * show an empty day.
 */
export function branchBookability(input: {
  hours: BranchHours | null;
  roomCount: number | null;
  enableRooms: boolean;
}): Bookability {
  const { hours, roomCount, enableRooms } = input;
  if (hours) {
    const [y, m, d] = REFERENCE_MONDAY.split("-").map(Number);
    const kinds = DAY_LABELS.map((_, i) =>
      slotRangeForDate(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10), hours)
    ).map((r) => (r === "day-off" ? "off" : r === "unconfigured" ? "unset" : "open"));
    if (!kinds.includes("open")) {
      return { bookable: false, reason: kinds.includes("unset") ? "hours-not-set" : "all-days-off" };
    }
  }
  if (enableRooms && roomCount === 0) return { bookable: false, reason: "no-rooms" };
  return { bookable: true };
}
