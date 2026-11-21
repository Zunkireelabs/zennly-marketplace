import { describe, expect, it } from "vitest";
import {
  bookUrl,
  branchToday,
  datesBetween,
  earliestMissingStep,
  lastBookableDay,
  notOfferedMessage,
  parseBookParams,
  previousStep,
  resolveServiceChoice,
  stepsFor,
} from "./booking-route";

const sp = (q: string) => new URLSearchParams(q);

describe("URLs carry the choices (refresh and Back are safe)", () => {
  it("builds each step's URL in a fixed order", () => {
    expect(bookUrl("nuad", "location")).toBe("/providers/nuad/book");
    expect(bookUrl("nuad", "location", { service: "s1" })).toBe("/providers/nuad/book?service=s1");
    expect(bookUrl("nuad", "services", { branch: "b1" })).toBe("/providers/nuad/book/services?branch=b1");
    expect(bookUrl("nuad", "services", { service: "s1", branch: "b1" })).toBe("/providers/nuad/book/services?branch=b1&service=s1");
    expect(bookUrl("nuad", "time", { branch: "b1", service: "s1", date: "2026-11-23" })).toBe(
      "/providers/nuad/book/time?branch=b1&service=s1&date=2026-11-23"
    );
    expect(bookUrl("nuad", "confirm", { branch: "b1", service: "s1", date: "2026-11-23", time: "14:30" })).toBe(
      "/providers/nuad/book/confirm?branch=b1&service=s1&date=2026-11-23&time=14:30"
    );
    expect(bookUrl("nuad", "done")).toBe("/providers/nuad/book/done");
  });

  it("round-trips through parseBookParams", () => {
    const p = { branch: "b1", service: "s1", date: "2026-11-23", time: "09:00" };
    expect(parseBookParams(sp(bookUrl("nuad", "confirm", p).split("?")[1]))).toEqual(p);
  });

  it("carries the 'time is gone' notice to the time step", () => {
    const url = bookUrl("nuad", "time", { branch: "b1", service: "s1", date: "2026-11-23", notice: "gone" });
    expect(url).toBe("/providers/nuad/book/time?branch=b1&service=s1&date=2026-11-23&notice=gone");
    expect(parseBookParams(sp(url.split("?")[1])).notice).toBe("gone");
  });

  it("drops malformed date and time instead of trusting them", () => {
    const p = parseBookParams(sp("date=tomorrow&time=25:99&branch=b"));
    expect(p).toEqual({ branch: "b", service: undefined, date: undefined, time: undefined, notice: undefined });
  });
});

describe("steps", () => {
  it("skips Location for a one-branch studio", () => {
    expect(stepsFor(false).map((s) => s.id)).toEqual(["services", "time", "confirm"]);
    expect(stepsFor(true).map((s) => s.id)).toEqual(["location", "services", "time", "confirm"]);
  });

  it("Back goes one step toward the studio page; the first step goes to the studio page", () => {
    expect(previousStep("confirm", true)).toBe("time");
    expect(previousStep("time", true)).toBe("services");
    expect(previousStep("services", true)).toBe("location");
    expect(previousStep("services", false)).toBeNull();
    expect(previousStep("location", true)).toBeNull();
  });

  it("sends a half-filled URL to the first step it lacks", () => {
    expect(earliestMissingStep({})).toBe("location");
    expect(earliestMissingStep({ branch: "b" })).toBe("services");
    expect(earliestMissingStep({ branch: "b", service: "s" })).toBe("time");
    expect(earliestMissingStep({ branch: "b", service: "s", date: "2026-11-23" })).toBe("time");
    expect(earliestMissingStep({ branch: "b", service: "s", date: "2026-11-23", time: "10:00" })).toBe("confirm");
  });
});

describe("entry points a-e", () => {
  const offered = ["s1", "s2"];
  it("(a) Book now with nothing chosen: no service anywhere", () => {
    expect(bookUrl("nuad", "location", {})).toBe("/providers/nuad/book");
    expect(resolveServiceChoice(undefined, offered)).toEqual({ kind: "none" });
  });
  it("(b)/(c) a service row or the dropdown carries ?service= through Location, then it stays selected", () => {
    expect(bookUrl("nuad", "location", { service: "s1" })).toContain("?service=s1");
    expect(bookUrl("nuad", "services", { branch: "b1", service: "s1" })).toBe("/providers/nuad/book/services?branch=b1&service=s1");
    expect(resolveServiceChoice("s1", offered)).toEqual({ kind: "kept", serviceId: "s1" });
  });
  it("(d) a one-branch studio goes straight to Services with the service kept", () => {
    expect(stepsFor(false)[0].id).toBe("services");
    expect(bookUrl("nuad", "services", { branch: "only", service: "s1" })).toContain("service=s1");
  });
  it("(e) a branch that doesn't offer the service: nothing selected and a plain note", () => {
    expect(resolveServiceChoice("s9", offered)).toEqual({ kind: "not-offered", serviceId: "s9" });
    expect(notOfferedMessage("BODY SCRUB - 60min", "Lazimpat")).toBe(
      "BODY SCRUB - 60min isn't offered at Lazimpat. Choose another service or go back and change location."
    );
    expect(bookUrl("nuad", "services", { branch: "b1" })).toBe("/providers/nuad/book/services?branch=b1");
  });
});

describe("date window", () => {
  it("runs from today to today + advance days, inclusive", () => {
    expect(lastBookableDay("2026-11-30", 2)).toBe("2026-12-02");
    const days = datesBetween("2026-11-30", lastBookableDay("2026-11-30", 2));
    expect(days).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
  });
});

describe("location card status (Kathmandu time)", () => {
  const hours = { weekly: [], openTime: "09:00:00", closeTime: "17:00:00" };
  // 2026-11-23 06:00 UTC = 11:45 in Kathmandu
  const noon = new Date("2026-11-23T06:00:00Z");
  const night = new Date("2026-11-23T16:00:00Z"); // 21:45 in Kathmandu
  it("open within hours, closed outside", () => {
    expect(branchToday(hours, [], noon)).toEqual({ hoursText: "9:00 AM – 5:00 PM", state: "open" });
    expect(branchToday(hours, [], night).state).toBe("closed");
  });
  it("closed today on a day off or a closed date", () => {
    const off = { weekly: Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, start_time: null, end_time: null, is_day_off: true })), openTime: null, closeTime: null };
    expect(branchToday(off, [], noon)).toEqual({ hoursText: "Closed today", state: "closed" });
    expect(branchToday(hours, [{ startDate: "2026-11-23", endDate: "2026-11-23" }], noon).state).toBe("closed");
  });
  it("says nothing when hours are unknown", () => {
    expect(branchToday(null, null, noon)).toEqual({ hoursText: null, state: null });
    expect(branchToday({ weekly: [], openTime: null, closeTime: null }, [], noon)).toEqual({ hoursText: null, state: null });
  });
});
