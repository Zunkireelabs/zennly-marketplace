import { describe, expect, it } from "vitest";
import { initialBranch, needsLocationStep } from "./engine-branches";

describe("single-branch vs multi-branch org", () => {
  const a = { id: "a" };
  const b = { id: "b" };

  it("single branch: auto-selected, no location step", () => {
    expect(initialBranch([a])).toBe(a);
    expect(needsLocationStep(true, 1, true)).toBe(false);
  });

  it("multi-branch: nothing auto-selected, the customer must choose", () => {
    expect(initialBranch([a, b])).toBeNull();
    expect(needsLocationStep(true, 2, false)).toBe(true);
  });

  it("multi-branch with a choice made: no location step", () => {
    expect(needsLocationStep(true, 2, true)).toBe(false);
  });

  it("no branches (or not loaded yet): nothing chosen and no step to show", () => {
    expect(initialBranch([])).toBeNull();
    expect(needsLocationStep(true, 0, false)).toBe(false);
    expect(needsLocationStep(false, 3, false)).toBe(false);
  });
});
