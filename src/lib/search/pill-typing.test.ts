import { describe, expect, it } from "vitest";
import { typingFrame } from "./pill-typing";

const CITIES = ["Lazimpat", "Thamel", "Sanepa"] as const;

describe("typingFrame", () => {
  it("types the first city one character at a time starting at tick 0", () => {
    expect(typingFrame(0, CITIES)).toEqual({ city: "Lazimpat", text: "L" });
    expect(typingFrame(1, CITIES)).toEqual({ city: "Lazimpat", text: "La" });
    expect(typingFrame(2, CITIES)).toEqual({ city: "Lazimpat", text: "Laz" });
  });

  it("shows the full word once every character has been typed", () => {
    // "Lazimpat" is 8 characters, so tick 7 is the first tick showing it complete.
    expect(typingFrame(7, CITIES)).toEqual({ city: "Lazimpat", text: "Lazimpat" });
  });

  it("holds the full word on screen for a while before moving on", () => {
    // Still within the hold window after the word finished typing.
    expect(typingFrame(10, CITIES)).toEqual({ city: "Lazimpat", text: "Lazimpat" });
    expect(typingFrame(20, CITIES)).toEqual({ city: "Lazimpat", text: "Lazimpat" });
  });

  it("clears and starts typing the next city once the hold window ends", () => {
    // Lazimpat: 8 chars + 14 hold ticks = 22 ticks total before Thamel starts.
    expect(typingFrame(22, CITIES)).toEqual({ city: "Thamel", text: "T" });
    expect(typingFrame(23, CITIES)).toEqual({ city: "Thamel", text: "Th" });
  });

  it("cycles back to the first city after the last one's hold window ends", () => {
    // Lazimpat (8+14=22) + Thamel (6+14=20) + Sanepa (6+14=20) = 62 ticks per full cycle.
    expect(typingFrame(62, CITIES)).toEqual({ city: "Lazimpat", text: "L" });
    expect(typingFrame(62 + 100 * 62, CITIES)).toEqual({ city: "Lazimpat", text: "L" });
  });

  it("is a pure function of the tick — the same tick always yields the same frame", () => {
    expect(typingFrame(15, CITIES)).toEqual(typingFrame(15, CITIES));
  });

  it("returns an empty frame for an empty city list rather than throwing", () => {
    expect(typingFrame(5, [])).toEqual({ city: "", text: "" });
  });
});
