// How long the fully-typed city stays on screen, in ticks, before the next one starts typing.
const HOLD_TICKS = 14;

/**
 * One frame of the collapsed search pill's typing animation: given a tick count (one tick per
 * timer interval, starting at 0) and the list of cities to cycle through, returns which city is
 * "active" and how much of it has been typed so far.
 *
 * Pure and independent of any timer — the component owns the interval and the tick count; this
 * just maps a tick to a frame, so the cycle itself is testable without faking time.
 */
export function typingFrame(tick: number, cities: readonly string[]): { city: string; text: string } {
  if (cities.length === 0) return { city: "", text: "" };

  const cycleLengths = cities.map((city) => city.length + HOLD_TICKS);
  const total = cycleLengths.reduce((sum, len) => sum + len, 0);
  let offset = ((tick % total) + total) % total;

  for (let i = 0; i < cities.length; i++) {
    const len = cycleLengths[i];
    if (offset < len) {
      const city = cities[i];
      const charsTyped = Math.min(offset + 1, city.length);
      return { city, text: city.slice(0, charsTyped) };
    }
    offset -= len;
  }

  // Unreachable: offset is always < total, and the loop covers every cycleLengths entry.
  return { city: cities[0], text: cities[0] };
}
