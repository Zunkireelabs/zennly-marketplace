import type { BookingAvailability } from "@/lib/booking/availability";
import { telHref } from "@/lib/booking/availability";

/**
 * What stands where the Book button, service picker and price box used to be when a studio isn't
 * taking online bookings (ZNLY-346; mockup-346). Pure display: the page decided the state.
 */

function PhoneIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  );
}

const callClass =
  "flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-primary px-5 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export function bookingOffMessage(a: Exclude<BookingAvailability, { state: "live" }>): { title: string; sub?: string } {
  switch (a.state) {
    case "not_live":
      return { title: "Online booking isn't available yet", sub: a.phone ? "You can still call the studio to book." : undefined };
    case "unavailable":
      return { title: "Online booking isn't available right now", sub: "Please try again in a little while." };
    case "demo":
      return { title: "This is a demo listing", sub: "It isn't a real studio, so booking is turned off." };
  }
}

/** The block inside the desktop booking card. */
export function BookingOffCard({ availability }: { availability: Exclude<BookingAvailability, { state: "live" }> }) {
  const m = bookingOffMessage(availability);
  const phone = availability.state === "not_live" ? availability.phone : null;
  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="flex items-start gap-2.5">
        {availability.state === "demo" && <InfoIcon />}
        <div>
          <p className="text-base font-medium">{m.title}</p>
          {m.sub && <p className="mt-1.5 text-sm leading-normal text-muted-foreground">{m.sub}</p>}
        </div>
      </div>
      {phone && (
        <a href={telHref(phone)} className={`mt-4 ${callClass}`}>
          <PhoneIcon />
          Call {phone}
        </a>
      )}
    </div>
  );
}

/** The phone-width bar pinned to the bottom of the studio page. */
export function BookingOffBar({ availability }: { availability: Exclude<BookingAvailability, { state: "live" }> }) {
  const m = bookingOffMessage(availability);
  const phone = availability.state === "not_live" ? availability.phone : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-background/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
      <div>
        <p className="text-[15px] font-medium">{availability.state === "demo" ? "Demo listing, booking is off" : m.title}</p>
        {availability.state === "unavailable" && m.sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{m.sub}</p>}
      </div>
      {phone && (
        <a href={telHref(phone)} className={`${callClass} min-w-28`}>
          Call
        </a>
      )}
    </div>
  );
}
