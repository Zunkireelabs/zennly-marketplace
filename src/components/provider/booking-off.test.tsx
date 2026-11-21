import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookingOffBar, BookingOffCard } from "./booking-off";

describe("booking-off display", () => {
  it("not live with phone: sentence + tap-to-call, no Book", () => {
    const html = renderToStaticMarkup(<BookingOffCard availability={{ state: "not_live", phone: "980-000-0000" }} />);
    expect(html).toContain("Online booking isn&#x27;t available yet");
    expect(html).toContain('href="tel:9800000000"');
    expect(html).not.toContain("Book now");
  });
  it("not live without phone: just the sentence, no link", () => {
    const html = renderToStaticMarkup(<BookingOffCard availability={{ state: "not_live", phone: null }} />);
    expect(html).toContain("isn&#x27;t available yet");
    expect(html).not.toContain("tel:");
  });
  it("check failed: 'right now', no phone", () => {
    const html = renderToStaticMarkup(<BookingOffBar availability={{ state: "unavailable" }} />);
    expect(html).toContain("isn&#x27;t available right now");
    expect(html).not.toContain("tel:");
  });
  it("demo: says so, no phone", () => {
    expect(renderToStaticMarkup(<BookingOffCard availability={{ state: "demo" }} />)).toContain("This is a demo listing");
    expect(renderToStaticMarkup(<BookingOffBar availability={{ state: "demo" }} />)).toContain("Demo listing, booking is off");
  });
});
