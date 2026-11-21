import { isDateInRanges, minutesToTime12, nepalClock, slotRangeForDate, type BranchHours } from "./engine-availability";

/**
 * The booking pages' URL rules, kept pure so they can be tested. Every choice a customer makes
 * (branch, service, day, time) lives in the URL, so a refresh or the Back button never loses it.
 *
 *   /providers/:slug/book            ① Location (skipped for a one-branch studio)
 *   /providers/:slug/book/services   ② Services
 *   /providers/:slug/book/time       ③ Time
 *   /providers/:slug/book/confirm    ④ Confirm
 *   /providers/:slug/book/done       done
 */

export type BookStep = "location" | "services" | "time" | "confirm" | "done";

export type BookParams = {
  branch?: string;
  service?: string;
  /** YYYY-MM-DD */
  date?: string;
  /** HH:MM, 24-hour */
  time?: string;
  /** One-off message for the next page (not a choice): the saved time was taken meanwhile. */
  notice?: "gone";
};

const PATH: Record<BookStep, string> = { location: "", services: "/services", time: "/time", confirm: "/confirm", done: "/done" };

/** The step names the step bar shows, in order. Location is left out for a one-branch studio. */
export function stepsFor(multiBranch: boolean): { id: Exclude<BookStep, "done">; label: string }[] {
  const all = [
    { id: "location" as const, label: "Location" },
    { id: "services" as const, label: "Services" },
    { id: "time" as const, label: "Time" },
    { id: "confirm" as const, label: "Confirm" },
  ];
  return multiBranch ? all : all.slice(1);
}

export function bookUrl(slug: string, step: BookStep, params: BookParams = {}): string {
  // Fixed order, so the same choices always make the same URL. Date and time are shaped
  // YYYY-MM-DD / HH:MM and stay readable (a ":" is fine in a query string).
  const q: string[] = [];
  if (params.branch) q.push(`branch=${encodeURIComponent(params.branch)}`);
  if (params.service) q.push(`service=${encodeURIComponent(params.service)}`);
  if (params.date) q.push(`date=${params.date}`);
  if (params.time) q.push(`time=${params.time}`);
  if (params.notice) q.push(`notice=${params.notice}`);
  const qs = q.join("&");
  return `/providers/${slug}/book${PATH[step]}${qs ? `?${qs}` : ""}`;
}

type SearchParamsLike = { get(name: string): string | null };

/** Reads the choices out of a URL, throwing away anything that isn't shaped right. */
export function parseBookParams(sp: SearchParamsLike): BookParams {
  const date = sp.get("date");
  const time = sp.get("time");
  const branch = sp.get("branch");
  const service = sp.get("service");
  return {
    branch: branch && branch.length <= 64 ? branch : undefined,
    service: service && service.length <= 64 ? service : undefined,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    time: time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : undefined,
    notice: sp.get("notice") === "gone" ? "gone" : undefined,
  };
}

/** The step before this one, or null when the customer should go back to the studio page. */
export function previousStep(step: BookStep, multiBranch: boolean): BookStep | null {
  if (step === "time") return "services";
  if (step === "confirm") return "time";
  if (step === "services") return multiBranch ? "location" : null;
  return null;
}

/** Which step the URL's choices are enough for. Used to send a half-filled URL to the right place. */
export function earliestMissingStep(p: BookParams): BookStep {
  if (!p.branch) return "location";
  if (!p.service) return "services";
  if (!p.date || !p.time) return "time";
  return "confirm";
}

export type ServiceChoice =
  | { kind: "none" }
  | { kind: "kept"; serviceId: string }
  /** A service was chosen earlier, but the branch now picked doesn't offer it. */
  | { kind: "not-offered"; serviceId: string };

/** Is the service carried in the URL one this branch offers? */
export function resolveServiceChoice(serviceId: string | undefined, offeredIds: readonly string[]): ServiceChoice {
  if (!serviceId) return { kind: "none" };
  return offeredIds.includes(serviceId) ? { kind: "kept", serviceId } : { kind: "not-offered", serviceId };
}

export function notOfferedMessage(serviceName: string, branchName: string): string {
  return `${serviceName} isn't offered at ${branchName}. Choose another service or go back and change location.`;
}

/** Every date from min to max inclusive (YYYY-MM-DD), for the date strip. Calendar arithmetic only. */
export function datesBetween(minISO: string, maxISO: string): string[] {
  const out: string[] = [];
  const [y, m, d] = minISO.split("-").map(Number);
  let t = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 400; i++) {
    const iso = new Date(t).toISOString().slice(0, 10);
    if (iso > maxISO) break;
    out.push(iso);
    t += 86400000;
  }
  return out;
}

/** Last bookable day: today + the branch's advance-booking days (inclusive), as book-spa does. */
export function lastBookableDay(todayISO: string, advanceDays: number): string {
  const [y, m, d] = todayISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + advanceDays)).toISOString().slice(0, 10);
}

export type BranchToday = { hoursText: string | null; state: "open" | "closed" | null };

/**
 * What a location card says about today: the opening hours line and OPEN NOW / CLOSED. Same
 * hours rule as the time step (slotRangeForDate), in Kathmandu time. Unknown hours say nothing
 * rather than guess.
 */
export function branchToday(hours: BranchHours | null, closedRanges: { startDate: string; endDate: string }[] | null, now: Date = new Date()): BranchToday {
  if (!hours) return { hoursText: null, state: null };
  const clock = nepalClock(now);
  const range = slotRangeForDate(clock.date, hours);
  if (range === "unconfigured") return { hoursText: null, state: null };
  if (range === "day-off" || isDateInRanges(clock.date, closedRanges ?? [])) return { hoursText: "Closed today", state: "closed" };
  const open = clock.minutes >= range.startMin && clock.minutes < range.endMin;
  return { hoursText: `${minutesToTime12(range.startMin)} – ${minutesToTime12(range.endMin)}`, state: open ? "open" : "closed" };
}
