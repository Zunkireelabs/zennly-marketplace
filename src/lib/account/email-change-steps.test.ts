import { describe, expect, it } from "vitest";
import { nextStep, type Step } from "./email-change-steps";

describe("nextStep", () => {
  it("moves from current to new once the first leg is accepted but not complete", () => {
    const result = nextStep("current", { ok: true, complete: false });
    expect(result.step).toBe("new");
    expect(result.error).toBeUndefined();
  });

  it("goes straight to done if accepting the current-address code is already the completing leg", () => {
    // Happens when the new-address code was spent elsewhere first (another tab, another device).
    const result = nextStep("current", { ok: true, complete: true });
    expect(result.step).toBe("done");
  });

  it("reaches done once the new-address code completes the change", () => {
    const result = nextStep("new", { ok: true, complete: true });
    expect(result.step).toBe("done");
  });

  it("sends an escape-link user who skipped step 1 back to current, with an explanation", () => {
    const result = nextStep("new", { ok: true, complete: false });
    expect(result.step).toBe("current");
    expect(result.error).toBe("You still need to confirm the code sent to your current address first.");
  });

  it("never reaches done from a bare new-address code alone — the ordering guarantee", () => {
    // Taking the escape link and entering the new code without having verified the old one first
    // must not complete the change. Only a true second leg (outcome.complete from the server)
    // reaches done from "new".
    const result = nextStep("new", { ok: true, complete: false });
    expect(result.step).not.toBe("done");
  });

  it("leaves the step unchanged on a rejected code at current", () => {
    const result = nextStep("current", { ok: false });
    expect(result.step).toBe("current");
    expect(result.error).toBe("That code is wrong or has expired.");
  });

  it("leaves the step unchanged on a rejected code at new", () => {
    const result = nextStep("new", { ok: false });
    expect(result.step).toBe("new");
    expect(result.error).toBe("That code is wrong or has expired.");
  });

  it("is a no-op at address or done — those steps never call verify, so nextStep never routes through them", () => {
    for (const step of ["address", "done"] as Step[]) {
      const result = nextStep(step, { ok: true, complete: true });
      expect(result.step).toBe(step);
    }
  });
});
