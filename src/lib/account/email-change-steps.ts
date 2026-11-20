export type Step = "address" | "current" | "new" | "done";

export type VerifyOutcome =
  | { ok: true; complete: boolean } // server accepted the code
  | { ok: false }; // wrong, expired, or already used

/**
 * Where the email-change dialog goes next, given the step it was on and what the server just
 * said about the code just submitted. This is the whole enforcement of "old address first, then
 * new" — see the row for `new` + `complete: false`, which is what catches someone who took the
 * escape link without having actually verified the old address.
 */
export function nextStep(step: Step, outcome: VerifyOutcome): { step: Step; error?: string } {
  if (!outcome.ok) {
    return { step, error: "That code is wrong or has expired." };
  }

  if (step === "current") {
    return outcome.complete ? { step: "done" } : { step: "new" };
  }

  if (step === "new") {
    if (outcome.complete) return { step: "done" };
    return {
      step: "current",
      error: "You still need to confirm the code sent to your current address first.",
    };
  }

  return { step };
}
