/**
 * READ-ONLY QC: prints what the marketplace drawer would offer for a studio, straight from the
 * bookX engine, so it can be compared with the bookX app by eye. Makes NO writes: only the same
 * anon reads the drawer itself makes (organizations/branches/branch_working_hours/rooms tables
 * and the public_* RPCs). Never calls the create function and needs no create secret.
 *
 * Run (staging values live in the gitignored .env.local):
 *   npx tsx --env-file=.env.local scripts/qc/engine-read-check.ts
 *   npx tsx --env-file=.env.local scripts/qc/engine-read-check.ts <org-slug> [<org-slug> …]
 *
 * With no slug arguments it finds "Sami's" and "Nuad" by name. Optional env:
 *   QC_SERVICE_MINUTES  length of the service to size slots for (default 60)
 *   QC_NOW              ISO instant to treat as "now" (default: the real clock)
 */
import { computeSoloSlots, nepalClock, slotRangeForDate } from "../../src/lib/booking/engine-availability";
import { getEngineClient } from "../../src/lib/booking/engine-client";
import {
  fetchEngineAvailabilityWindow,
  fetchEngineBranchHours,
  fetchEngineBranches,
  fetchEngineClosedRanges,
  fetchEngineGenderHeadcount,
  fetchEngineOrg,
  fetchEngineServices,
} from "../../src/lib/booking/engine-data";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // book-spa: Monday = 0

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function dayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY_NAMES[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}
function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

async function resolveSlugs(args: string[]): Promise<string[]> {
  if (args.length > 0) return args;
  const client = getEngineClient();
  if (!client) return [];
  const slugs: string[] = [];
  for (const needle of ["sami", "nuad"]) {
    const { data, error } = await client.from("organizations").select("slug, name").ilike("name", `%${needle}%`).eq("is_active", true);
    if (error || !data?.length) {
      console.log(`! Could not find an organization matching "${needle}" (${error?.message ?? "no rows"}). Pass its slug as an argument.`);
      continue;
    }
    for (const row of data) slugs.push(row.slug);
  }
  return [...new Set(slugs)];
}

async function checkStudio(slug: string, minutes: number, now: Date) {
  const clock = nepalClock(now);
  const today = clock.date;
  const tomorrow = addDays(today, 1);
  console.log(`\n${"=".repeat(72)}\nSTUDIO ${slug}`);

  const org = await fetchEngineOrg(slug);
  if (!org) return console.log("  ! organization not found or not readable");
  console.log(`  ${org.name} · currency ${org.currency} · rooms ${org.enableRooms ? "on" : "off"}`);

  const branches = await fetchEngineBranches(org.id);
  console.log(`  ${branches.length} active branch${branches.length === 1 ? "" : "es"} (${branches.length > 1 ? "multi-branch: customer picks" : "single branch: auto-selected"})`);

  const services = await fetchEngineServices(slug);
  const service = services.find((s) => s.durationMinutes === minutes) ?? services[0];
  const duration = service?.durationMinutes ?? minutes;
  console.log(`  slots sized for ${duration} min${service ? ` (${service.name})` : " (no service found, using default)"}`);

  for (const branch of branches) {
    console.log(`\n  BRANCH ${branch.name} · phone ${branch.phone ?? "none"} · advance ${branch.advanceBookingDays ?? "NULL (=30)"} days`);
    const hours = await fetchEngineBranchHours(branch.id);
    if (!hours) {
      console.log("    ! hours could not be read: the drawer would offer NO times here");
      continue;
    }
    console.log(`    fallback open/close: ${hours.openTime ?? "none"} – ${hours.closeTime ?? "none"}`);
    console.log("    weekly hours (what the drawer uses):");
    for (let i = 0; i < 7; i++) {
      const row = hours.weekly.find((r) => r.day_of_week === i);
      const src = row ? "row" : hours.openTime && hours.closeTime ? "fallback" : "NONE";
      const sample = addDays("2026-11-23", i); // a Monday + i
      const range = slotRangeForDate(sample, hours);
      const text = range === "day-off" ? "CLOSED (day off)" : range === "unconfigured" ? "no hours configured → no times" : `${hhmm(range.startMin)} – ${hhmm(range.endMin)}`;
      console.log(`      ${DAY_NAMES[i]}  ${text}  [${src}]`);
    }

    const end14 = addDays(today, 13);
    const closed = await fetchEngineClosedRanges(branch.id, today, end14);
    if (!closed) console.log("    ! closed dates could not be read: the drawer would offer NO times");
    else {
      const days: string[] = [];
      for (const r of closed) for (let d = r.startDate; d <= r.endDate; d = addDays(d, 1)) days.push(`${d} ${dayName(d)}`);
      console.log(`    closed dates, next 14 days (${today} → ${end14}): ${days.length ? days.join(", ") : "none"}`);
    }

    const window = await fetchEngineAvailabilityWindow(branch.id, today, addDays(today, (branch.advanceBookingDays ?? 30)));
    const counts = service ? await fetchEngineGenderHeadcount(slug, branch.id, service.id) : { male: 0, female: 0 };
    console.log(
      `    capacity inputs: ${window.rooms.length} active room(s), ${window.bookings.length} booking row(s) in window, ` +
        `eligible staff male ${counts.male} / female ${counts.female}, online cap ${branch.onlineBookingCapacity ?? "none"}`
    );
    const days = computeSoloSlots({
      dates: [today, tomorrow],
      rooms: window.rooms,
      bookings: window.bookings,
      therapistWindowRows: null,
      therapistWindowError: false,
      therapistFilter: null,
      durationMinutes: duration,
      genderPreference: "no-preference",
      enableRooms: org.enableRooms,
      therapistCounts: counts,
      closedRanges: closed,
      hours,
      onlineCapacity: branch.onlineBookingCapacity,
      now,
    });
    const tom = days[1];
    const offered = tom.slots.filter((s) => s.isAvailable).map((s) => s.time12);
    console.log(
      `    tomorrow ${tomorrow} ${dayName(tomorrow)}: ` +
        (tom.isClosed ? `CLOSED (${tom.closedReason})` : offered.length ? `first 5 offered → ${offered.slice(0, 5).join(", ")}  (${offered.length} offered of ${tom.slots.length})` : "no times offered")
    );
  }
}

async function main() {
  if (!getEngineClient()) {
    console.error("No engine configured. Run with: npx tsx --env-file=.env.local scripts/qc/engine-read-check.ts");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_BOOK_SPA_ENGINE_URL ?? "";
  console.log(`READ-ONLY check against ${url.replace(/^https?:\/\//, "").split(".")[0]}.* (project ref shown only)`);
  const now = process.env.QC_NOW ? new Date(process.env.QC_NOW) : new Date();
  const clock = nepalClock(now);
  console.log(`Kathmandu now: ${clock.date} ${hhmm(clock.minutes)}`);
  const slugs = await resolveSlugs(process.argv.slice(2));
  if (slugs.length === 0) return console.log("Nothing to check.");
  for (const slug of slugs) await checkStudio(slug, Number(process.env.QC_SERVICE_MINUTES) || 60, now);
}

main().catch((e) => {
  console.error("engine-read-check failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
