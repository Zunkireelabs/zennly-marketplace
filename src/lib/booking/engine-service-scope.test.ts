import { describe, expect, it } from "vitest";
import { narrowServicesToBranch, servicesOfferedAtAnyBranch } from "./engine-service-scope";

const svc = (id: string, category: string) => ({ id, category, name: id });
const ALL = [svc("massage", "Massage"), svc("scrub", "Body"), svc("hair", "Hair"), svc("voucher", "Vouchers"), svc("vip", "Products")];

describe("narrowServicesToBranch (what the drawer offers at one branch)", () => {
  it("drops the branch's excluded categories", () => {
    expect(narrowServicesToBranch(ALL, ["Hair", "Vouchers", "Products"], null, "b1").map((s) => s.id)).toEqual(["massage", "scrub"]);
  });

  it("a service with no link rows is offered everywhere", () => {
    expect(narrowServicesToBranch(ALL, [], [], "b1")).toHaveLength(5);
    expect(narrowServicesToBranch(ALL, [], null, "b1")).toHaveLength(5);
  });

  it("a linked service is offered only at the branches it's linked to", () => {
    const links = [{ service_id: "scrub", branch_id: "b2" }];
    expect(narrowServicesToBranch(ALL, [], links, "b1").map((s) => s.id)).not.toContain("scrub");
    expect(narrowServicesToBranch(ALL, [], links, "b2").map((s) => s.id)).toContain("scrub");
  });

  it("applies both rules together", () => {
    const links = [{ service_id: "massage", branch_id: "b2" }];
    expect(narrowServicesToBranch(ALL, ["Hair"], links, "b1").map((s) => s.id)).toEqual(["scrub", "voucher", "vip"]);
  });

  it("everything excluded → nothing", () => {
    expect(narrowServicesToBranch(ALL, ["Massage", "Body", "Hair", "Vouchers", "Products"], null, "b1")).toEqual([]);
  });
});

describe("servicesOfferedAtAnyBranch (what the studio page lists)", () => {
  const branches = [
    { id: "b1", excludedCategories: ["Hair", "Vouchers", "Products"] },
    { id: "b2", excludedCategories: ["Vouchers", "Products"] },
  ];

  it("is the union of what each branch offers, in the original order", () => {
    expect(servicesOfferedAtAnyBranch(ALL, branches, null).map((s) => s.id)).toEqual(["massage", "scrub", "hair"]);
  });

  it("never lists a service no branch would offer in the drawer", () => {
    const ids = servicesOfferedAtAnyBranch(ALL, branches, null).map((s) => s.id);
    expect(ids).not.toContain("voucher");
    expect(ids).not.toContain("vip");
  });

  it("every service the page lists is offered by the drawer at at least one branch", () => {
    const links = [{ service_id: "scrub", branch_id: "b2" }];
    const page = servicesOfferedAtAnyBranch(ALL, branches, links);
    for (const s of page) {
      const somewhere = branches.some((b) => narrowServicesToBranch(ALL, b.excludedCategories, links, b.id).some((x) => x.id === s.id));
      expect(somewhere).toBe(true);
    }
  });

  it("no branches → nothing is offered", () => {
    expect(servicesOfferedAtAnyBranch(ALL, [], null)).toEqual([]);
  });
});
