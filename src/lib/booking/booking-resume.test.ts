import { describe, expect, it } from "vitest";
import { RESUME_TTL_MS, clearResume, loadResume, saveResume, slotStillOffered } from "./booking-resume";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    raw: () => data,
  };
}

const STATE = { slug: "nuad-thai-spa", branchId: "branch-1", serviceId: "svc-1", date: "2026-11-24", minutes: 600 };
const NOW = 1_800_000_000_000;

describe("booking resume (survive a Google login redirect)", () => {
  it("round-trips what was saved for this studio", () => {
    const s = fakeStorage();
    saveResume(STATE, NOW, s);
    expect(loadResume("nuad-thai-spa", NOW + 1000, s)).toEqual({ ...STATE, savedAt: NOW });
  });

  it("a studio with a single branch (no branch id) round-trips too", () => {
    const s = fakeStorage();
    saveResume({ ...STATE, branchId: null }, NOW, s);
    expect(loadResume("nuad-thai-spa", NOW, s)?.branchId).toBeNull();
  });

  it("expires after 30 minutes and is removed", () => {
    const s = fakeStorage();
    saveResume(STATE, NOW, s);
    expect(loadResume("nuad-thai-spa", NOW + RESUME_TTL_MS, s)).not.toBeNull(); // exactly at the limit
    expect(loadResume("nuad-thai-spa", NOW + RESUME_TTL_MS + 1, s)).toBeNull();
    expect(s.raw().size).toBe(0);
  });

  it("ignores another studio's saved choices and leaves them for that page", () => {
    const s = fakeStorage();
    saveResume(STATE, NOW, s);
    expect(loadResume("some-other-studio", NOW, s)).toBeNull();
    expect(s.raw().size).toBe(1);
  });

  it("clearResume removes it", () => {
    const s = fakeStorage();
    saveResume(STATE, NOW, s);
    clearResume(s);
    expect(loadResume("nuad-thai-spa", NOW, s)).toBeNull();
  });

  it("discards malformed or tampered values", () => {
    const bad = [
      "not json",
      "null",
      JSON.stringify({}),
      JSON.stringify({ ...STATE, savedAt: NOW, minutes: 5000 }),
      JSON.stringify({ ...STATE, savedAt: NOW, minutes: 10.5 }),
      JSON.stringify({ ...STATE, savedAt: NOW, date: "tomorrow" }),
      JSON.stringify({ ...STATE, savedAt: NOW, serviceId: "" }),
      JSON.stringify({ ...STATE, savedAt: "now" }),
      JSON.stringify({ ...STATE, savedAt: NOW + 10 * RESUME_TTL_MS }), // from the future
    ];
    for (const raw of bad) {
      const s = fakeStorage({ "zennly-booking-resume": raw });
      expect(loadResume("nuad-thai-spa", NOW, s)).toBeNull();
      expect(s.raw().size).toBe(0);
    }
  });

  it("never throws when storage is missing or blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => saveResume(STATE, NOW, blocked)).not.toThrow();
    expect(() => clearResume(blocked)).not.toThrow();
    expect(loadResume("nuad-thai-spa", NOW, blocked)).toBeNull();
    expect(() => saveResume(STATE, NOW, null)).not.toThrow();
    expect(loadResume("nuad-thai-spa", NOW, null)).toBeNull();
  });

  it("holds no personal details", () => {
    const s = fakeStorage();
    saveResume(STATE, NOW, s);
    const stored = [...s.raw().values()][0];
    expect(Object.keys(JSON.parse(stored)).sort()).toEqual(["branchId", "date", "minutes", "savedAt", "serviceId", "slug"]);
  });
});

describe("slotStillOffered", () => {
  const slots = [
    { minutes: 540, available: true },
    { minutes: 600, available: false },
    { minutes: 630, available: true },
  ];
  it("true only when that exact slot exists and is available", () => {
    expect(slotStillOffered(slots, 540)).toBe(true);
    expect(slotStillOffered(slots, 630)).toBe(true);
  });
  it("false when it's taken, gone, or the day isn't bookable any more", () => {
    expect(slotStillOffered(slots, 600)).toBe(false);
    expect(slotStillOffered(slots, 700)).toBe(false);
    expect(slotStillOffered(null, 540)).toBe(false);
    expect(slotStillOffered([], 540)).toBe(false);
  });
});
