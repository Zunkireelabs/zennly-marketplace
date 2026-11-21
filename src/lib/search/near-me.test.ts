import { describe, expect, it } from "vitest";
import { haversineKm, nearestDestination } from "./near-me";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 27.7172, lng: 85.324 }, { lat: 27.7172, lng: 85.324 })).toBe(0);
  });

  it("matches the known distance for one degree of latitude at the equator (~111.19 km)", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });

  it("is symmetric", () => {
    const a = { lat: 27.7172, lng: 85.324 };
    const b = { lat: 28.2096, lng: 83.9856 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

type TestDestination = { city: string; lat?: number; lng?: number };

describe("nearestDestination", () => {
  const kathmandu: TestDestination = { city: "Kathmandu", lat: 27.7172, lng: 85.324 };
  const pokhara: TestDestination = { city: "Pokhara", lat: 28.2096, lng: 83.9856 };
  const austin: TestDestination = { city: "Austin", lat: 30.2672, lng: -97.7431 };
  const noCoords: TestDestination = { city: "Unmapped" };

  it("picks the nearest of several destinations", () => {
    const near = { lat: 27.72, lng: 85.33 }; // just outside Kathmandu
    expect(nearestDestination(near, [kathmandu, pokhara, austin])?.city).toBe("Kathmandu");
  });

  it("skips destinations with no coordinates rather than treating them as lat 0 / lng 0", () => {
    // Were the Gulf-of-Guinea fallback allowed, lat 0/lng 0 is closer to nothing real here and
    // noCoords would never spuriously win — but it also must never be RETURNED at all.
    const result = nearestDestination({ lat: 27.72, lng: 85.33 }, [noCoords, kathmandu]);
    expect(result?.city).toBe("Kathmandu");
  });

  it("returns null when every candidate lacks coordinates", () => {
    expect(nearestDestination({ lat: 0, lng: 0 }, [noCoords])).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(nearestDestination({ lat: 0, lng: 0 }, [])).toBeNull();
  });

  it("honestly returns a US city when queried from Nepal if that's genuinely nearest among the candidates given — not a bug to paper over", () => {
    const nepal = { lat: 27.7, lng: 85.3 };
    expect(nearestDestination(nepal, [austin])?.city).toBe("Austin");
  });
});
