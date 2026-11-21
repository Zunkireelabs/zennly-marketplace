import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./status-pill";
import { bookingDetail, bookingStatusLabel, membershipStatusLabel } from "@/lib/account/studio-lookup";

describe("status pill keeps the sentence the label gave", () => {
  it("no capitalize class, text untouched", () => {
    const html = renderToStaticMarkup(<StatusPill>{bookingStatusLabel("Pending")}</StatusPill>);
    expect(html).not.toContain("capitalize");
    expect(html).toContain("Waiting for the studio to confirm");
  });
  it("every label is already sentence case (first letter up, no Title Case Words)", () => {
    const labels = ["pending", "confirmed", "completed", "cancelled", "no show", "in-progress", "weird_new_status"].map((s) => bookingStatusLabel(s) as string);
    labels.push(...["active", "pending", "depleted", "lapsed", "mystery"].map((s) => membershipStatusLabel(s) as string));
    for (const l of labels) {
      expect(l[0]).toBe(l[0].toUpperCase());
      expect(l.slice(1)).toBe(l.slice(1).toLowerCase());
    }
  });
});

describe("booking number row", () => {
  it("is the first row, monospace, from bookX's booking_number", () => {
    const d = bookingDetail({ booking_number: "BK-20261123-0002", service_name_snapshot: "Massage", status: "Pending" });
    expect(d.rows[0]).toEqual({ label: "Booking", value: "BK-20261123-0002", mono: true });
  });
  it("no booking_number → no row", () => {
    expect(bookingDetail({ service_name_snapshot: "Massage" }).rows.find((r) => r.label === "Booking")).toBeUndefined();
  });
});
