import { describe, expect, it } from "vitest";
import { engineId } from "./engine-id";

describe("engineId", () => {
  it("accepts any 8-4-4-4-12 hex id, including non-v4 ones", () => {
    for (const id of ["b0000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000001", "7d9f1f0e-2b57-4a39-9c1a-0d0f6f0f8f11", "ABCDEF00-0000-0000-0000-000000000001"]) {
      expect(engineId.safeParse(id).success).toBe(true);
    }
  });
  it("rejects junk", () => {
    for (const id of ["nope", "", "b0000000-0000-0000-0000-00000000000", "g0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000001 "]) {
      expect(engineId.safeParse(id).success).toBe(false);
    }
  });
});
