import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSoloSlots } from "./engine-availability";

// A fake of the one thing engine-data talks to: the anon engine client.
const rpc = vi.fn();
const from = vi.fn();
let client: { rpc: typeof rpc; from: typeof from } | null = null;
vi.mock("./engine-client", () => ({ getEngineClient: () => client }));

import { closedDatesToRanges, fetchEngineBranchHours, fetchEngineClosedRanges } from "./engine-data";

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
  client = { rpc, from };
});

describe("closedDatesToRanges", () => {
  it("collapses consecutive days into one range", () => {
    expect(closedDatesToRanges(["2026-11-24", "2026-11-25", "2026-11-26"])).toEqual([
      { startDate: "2026-11-24", endDate: "2026-11-26" },
    ]);
  });

  it("keeps separate ranges for separate gaps", () => {
    expect(closedDatesToRanges(["2026-11-24", "2026-11-26"])).toEqual([
      { startDate: "2026-11-24", endDate: "2026-11-24" },
      { startDate: "2026-11-26", endDate: "2026-11-26" },
    ]);
  });

  it("joins across a month and a year boundary", () => {
    expect(closedDatesToRanges(["2026-11-30", "2026-12-01"])).toEqual([{ startDate: "2026-11-30", endDate: "2026-12-01" }]);
    expect(closedDatesToRanges(["2026-12-31", "2027-01-01"])).toEqual([{ startDate: "2026-12-31", endDate: "2027-01-01" }]);
  });

  it("sorts unsorted input and ignores duplicates", () => {
    expect(closedDatesToRanges(["2026-11-26", "2026-11-24", "2026-11-24", "2026-11-25"])).toEqual([
      { startDate: "2026-11-24", endDate: "2026-11-26" },
    ]);
  });

  it("empty in, empty out", () => {
    expect(closedDatesToRanges([])).toEqual([]);
  });
});

describe("fetchEngineClosedRanges reads the anon-callable RPC, not the locked-down table", () => {
  it("calls public_get_closed_dates with the branch and window, and never reads manual_blocks", async () => {
    rpc.mockResolvedValue({ data: [{ closed_date: "2026-11-24" }], error: null });
    const out = await fetchEngineClosedRanges("branch-1", "2026-11-23", "2026-12-23");
    expect(rpc).toHaveBeenCalledWith("public_get_closed_dates", {
      p_branch_id: "branch-1",
      p_start: "2026-11-23",
      p_end: "2026-12-23",
    });
    expect(from).not.toHaveBeenCalled();
    expect(out).toEqual([{ startDate: "2026-11-24", endDate: "2026-11-24" }]);
  });

  it("a day the RPC returns as closed → no slots offered (end to end)", async () => {
    rpc.mockResolvedValue({ data: [{ closed_date: "2026-11-24" }], error: null });
    const closedRanges = await fetchEngineClosedRanges("branch-1", "2026-11-23", "2026-11-25");
    const [mon, tue] = computeSoloSlots({
      dates: ["2026-11-23", "2026-11-24"],
      rooms: [{ id: "r", capacity: 1 }],
      bookings: [],
      therapistWindowRows: null,
      therapistWindowError: false,
      therapistFilter: null,
      durationMinutes: 60,
      genderPreference: "no-preference",
      enableRooms: true,
      therapistCounts: { male: 1, female: 1 },
      closedRanges,
      hours: { weekly: [], openTime: "09:00:00", closeTime: "17:00:00" },
      onlineCapacity: null,
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(mon.slots.length).toBeGreaterThan(0);
    expect(tue.slots).toEqual([]);
    expect(tue.closedReason).toBe("closed-date");
  });

  it("an RPC error is 'unknown' (null), never 'open' ([])", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await fetchEngineClosedRanges("b", "2026-11-23", "2026-12-23")).toBeNull();
  });

  it("no engine client configured → null", async () => {
    client = null;
    expect(await fetchEngineClosedRanges("b", "2026-11-23", "2026-12-23")).toBeNull();
  });
});

describe("fetchEngineBranchHours", () => {
  function tables(weekly: unknown, branch: unknown) {
    from.mockImplementation((table: string) => {
      if (table === "branch_working_hours") return { select: () => ({ eq: () => Promise.resolve(weekly) }) };
      if (table === "branches") return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(branch) }) }) };
      throw new Error(`unexpected table ${table}`);
    });
  }

  it("returns the weekly rows as stored plus the open/close fallback", async () => {
    const rows = [{ day_of_week: 0, start_time: "09:00:00", end_time: "17:00:00", is_day_off: false }];
    tables({ data: rows, error: null }, { data: { open_time: "08:00:00", close_time: "18:00:00" }, error: null });
    expect(await fetchEngineBranchHours("b")).toEqual({ weekly: rows, openTime: "08:00:00", closeTime: "18:00:00" });
  });

  it("a branch with no rows and no times comes back empty (the drawer then offers no slots)", async () => {
    tables({ data: [], error: null }, { data: null, error: null });
    expect(await fetchEngineBranchHours("b")).toEqual({ weekly: [], openTime: null, closeTime: null });
  });

  it("a read error on either table → null (unknown)", async () => {
    tables({ data: null, error: { message: "denied" } }, { data: { open_time: null, close_time: null }, error: null });
    expect(await fetchEngineBranchHours("b")).toBeNull();
    tables({ data: [], error: null }, { data: null, error: { message: "denied" } });
    expect(await fetchEngineBranchHours("b")).toBeNull();
  });
});
