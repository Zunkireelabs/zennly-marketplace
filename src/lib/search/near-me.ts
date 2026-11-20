export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * The closest destination to a position, by great-circle distance. A destination with no
 * coordinates (its studios never resolved one) is skipped rather than treated as lat 0/lng 0 —
 * that point is in the Gulf of Guinea and would incorrectly win against every real candidate.
 * Returns null only when no candidate has coordinates at all.
 */
export function nearestDestination<T extends { lat?: number; lng?: number }>(
  position: LatLng,
  destinations: readonly T[],
): T | null {
  let best: T | null = null;
  let bestKm = Infinity;
  for (const d of destinations) {
    if (typeof d.lat !== "number" || typeof d.lng !== "number") continue;
    const km = haversineKm(position, { lat: d.lat, lng: d.lng });
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return best;
}
