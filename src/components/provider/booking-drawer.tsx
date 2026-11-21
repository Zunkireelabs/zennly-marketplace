"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-provider";
import { normalizeEmail, normalizeName } from "@/lib/auth/normalize";
import { formatDuration } from "@/lib/providers";
import { useEngineBooking } from "@/lib/booking/use-engine-booking";
import { computeSoloSlots, timeToMinutes } from "@/lib/booking/engine-availability";
import { bookingErrorMessage } from "@/lib/booking/engine-errors";
import type { EngineBranch } from "@/lib/booking/engine-data";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, StarIcon } from "./icons";
import { useProviderUi, type BookingStep } from "./provider-shell";
import { Price } from "@/components/ui/price";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

const BASE_STEPS: { id: Exclude<BookingStep, "done" | "location">; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "time", label: "Time" },
  { id: "confirm", label: "Confirm" },
];
const STEPS_WITH_LOCATION: { id: Exclude<BookingStep, "done">; label: string }[] = [
  { id: "location", label: "Location" },
  ...BASE_STEPS,
];

const SLOT_STEP_MINUTES = 30;
/** How far ahead a visit can be booked. */
const DAYS_AHEAD = 60;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Same opening hours as the provider page's hours table (providers.ts). */
function hoursFor(date: Date): { open: number; close: number } {
  const dow = date.getDay();
  if (dow === 0) return { open: 10 * 60, close: 17 * 60 };
  if (dow === 6) return { open: 9 * 60, close: 18 * 60 };
  return { open: 9 * 60, close: 20 * 60 };
}

/** Stable placeholder availability, so a given slot doesn't flicker between renders. */
function isTaken(seed: string): boolean {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 4 === 0;
}

export function BookingDrawer() {
  const {
    provider,
    bookingOpen,
    step,
    selectedIds,
    selectedServices,
    totalPrice,
    totalMinutes,
    dateISO,
    time,
    forWhom,
    setForWhom,
    closeBooking,
    setStep,
    toggleService,
    chooseService,
    setDateISO,
    setTime,
    resetBooking,
    clearServiceSelection,
  } = useProviderUi();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const { user, openLogin } = useAuth();
  // undefined = untouched, so a signed-in person's details show as the default without an effect.
  const [guest, setGuest] = useState<{ name?: string; email?: string; phone?: string; notes: string }>({ notes: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; attendee?: string }>({});
  const bookerName = guest.name ?? user?.name ?? "";
  const bookerEmail = guest.email ?? user?.email ?? "";
  const bookerPhone = guest.phone ?? "";
  const [submitting, setSubmitting] = useState(false);
  // Generated once per booking attempt and reused on retry, so a retry after a dropped
  // response replays the same booking instead of creating a second one (public_create_booking,
  // migration-335, is idempotent on this key). Reset only when a fresh booking flow starts.
  const idempotencyKeyRef = useRef<string | null>(null);

  // Everything below gated on `engine.active` is false (every fetch a no-op) for unconnected
  // providers or with the flag off — see src/lib/booking/engine-flag.ts. Behaviour in that case
  // is byte-identical to the simulator this replaces.
  const engine = useEngineBooking(provider, bookingOpen);
  const showLocationStep = engine.active && engine.branches.length > 1;
  const STEPS = showLocationStep ? STEPS_WITH_LOCATION : BASE_STEPS;

  // book-spa's own BranchGate-vs-auto-select rule (provider-profile-flow/index.jsx:104-120):
  // land on the location step whenever there's more than one branch and none is chosen yet,
  // regardless of which step provider-shell's openBooking() initially picked — a service
  // selected on the studio page before opening the drawer does not skip this; location is
  // branch-scoped in book-spa and nothing is known to be bookable at a branch that hasn't been
  // picked yet.
  useEffect(() => {
    if (!bookingOpen || !engine.needsLocationStep || step === "location") return;
    setStep("location");
  }, [bookingOpen, engine.needsLocationStep, step, setStep]);

  // book-spa's handleBranchSelect: picking (or changing) a branch clears service/time, since
  // both are branch-scoped — a service valid at one branch may not exist at another, and a
  // time slot's availability is branch-specific. This also means a service pre-selected via the
  // studio page's per-service Book button does NOT survive the location step when a connected
  // provider has more than one branch: book-spa's own customer flow never lets a service be
  // chosen before a branch either (location is always first there), so there is no "preserve a
  // pre-selection across a branch-scoped reset" behaviour to match — the branch MUST be picked
  // before anything branch-scoped can be trusted. The customer re-picks after the location step.
  const pickLocation = (branch: EngineBranch) => {
    engine.pickBranch(branch);
    clearServiceSelection();
    setStep("services");
  };

  // The gender-eligible headcount RPC is per-service, so it's loaded for whichever service is
  // first selected (matching book-spa's own single-service-at-a-time gender-preference fetch;
  // the drawer's multi-select is a marketplace-only convenience with no book-spa counterpart to
  // match more precisely than this).
  const firstSelectedId = selectedIds[0];
  useEffect(() => {
    if (!engine.active || !engine.selectedBranch || !firstSelectedId) return;
    engine.loadGenderCounts(firstSelectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.active, engine.selectedBranch, firstSelectedId]);

  const visibleServiceIds = useMemo(
    () => (engine.active && engine.selectedBranch ? new Set(engine.services.map((s) => s.id)) : null),
    [engine.active, engine.selectedBranch, engine.services]
  );
  // Branch-scoped narrowing only changes WHICH of provider.services are offered here — the
  // service data itself (name/price/duration) is already real engine data for every id
  // (src/lib/booking/engine-live-services.ts, fetched org-wide on the page), so there is no
  // separate source to reconcile, just a filter.
  const visibleServices = visibleServiceIds ? provider.services.filter((s) => visibleServiceIds.has(s.id)) : provider.services;
  const visibleCategories = visibleServiceIds
    ? provider.serviceCategories.filter((c) => visibleServices.some((s) => s.category === c))
    : provider.serviceCategories;

  // The bookable window is computed client-side after the drawer opens (this component only
  // renders its body while open), so server HTML never depends on "today". For a connected
  // provider this respects the branch's real advance_booking_days instead of the simulator's
  // fixed 60 — book-spa's own calendar wouldn't offer a date beyond that either, so matching it
  // is what makes the two sites' calendars agree, not just their slot grids.
  const daysAhead = engine.active ? engine.advanceBookingDays : DAYS_AHEAD;
  const bounds = useMemo(() => {
    if (!bookingOpen) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = new Date(today);
    last.setDate(today.getDate() + daysAhead - 1);
    return { minISO: toISO(today), maxISO: toISO(last) };
  }, [bookingOpen, daysAhead]);

  const activeISO = dateISO ?? bounds?.minISO ?? null;

  // Real availability for the whole window, computed once per branch/duration/gender-count
  // change — mirrors book-spa's own DateTimeSelection.jsx, which also computes every day's
  // slots in one pass rather than per date click. null outside the engine path.
  const engineDays = useMemo(() => {
    if (!engine.active || !engine.selectedBranch || !engine.availabilityLoaded || !bounds) return null;
    const dates: string[] = [];
    let d = fromISO(bounds.minISO);
    while (toISO(d) <= bounds.maxISO) {
      dates.push(toISO(d));
      d = new Date(d.getTime() + 86400000);
    }
    return computeSoloSlots({
      dates,
      rooms: engine.rooms,
      bookings: engine.bookings,
      therapistWindowRows: null,
      therapistWindowError: false,
      therapistFilter: null,
      durationMinutes: totalMinutes || 60,
      genderPreference: "no-preference",
      enableRooms: engine.enableRooms,
      therapistCounts: engine.genderCounts,
      closedRanges: engine.closedRanges,
      onlineCapacity: engine.selectedBranch.onlineBookingCapacity,
    });
  }, [
    engine.active,
    engine.selectedBranch,
    engine.availabilityLoaded,
    engine.rooms,
    engine.bookings,
    engine.enableRooms,
    engine.genderCounts,
    engine.closedRanges,
    bounds,
    totalMinutes,
  ]);

  const slots = useMemo(() => {
    if (!activeISO || totalMinutes === 0) return [];

    if (engine.active) {
      if (!engineDays) return [];
      const day = engineDays.find((d) => d.date === activeISO);
      if (!day) return [];
      return day.slots.map((s) => ({
        minutes: timeToMinutes(s.time24),
        label: s.time12,
        available: s.isAvailable,
      }));
    }

    const date = fromISO(activeISO);
    const { open, close } = hoursFor(date);
    const now = new Date();
    const isToday = toISO(now) === activeISO;
    const earliest = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : 0;
    const out: { minutes: number; label: string; available: boolean }[] = [];
    for (let m = open; m + totalMinutes <= close; m += SLOT_STEP_MINUTES) {
      if (m < earliest) continue;
      out.push({
        minutes: m,
        label: formatMinutes(m),
        available: !isTaken(`${provider.slug}-${activeISO}-${m}`),
      });
    }
    return out;
  }, [activeISO, totalMinutes, provider.slug, engine.active, engineDays]);

  // Lock page scroll, close on Escape, move focus into the panel.
  useEffect(() => {
    if (!bookingOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      // A login dialog opened on top handles its own Escape.
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) closeBooking();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [bookingOpen, closeBooking]);

  const stepIndex = step === "done" ? STEPS.length : STEPS.findIndex((s) => s.id === step);

  const goBack = () => {
    if (step === "services" && showLocationStep) setStep("location");
    if (step === "time") setStep("services");
    if (step === "confirm") setStep("time");
  };

  const goNext = () => {
    if (step === "services" && selectedIds.length > 0) {
      if (!dateISO && activeISO) setDateISO(activeISO);
      setStep("time");
    } else if (step === "time" && time) {
      setStep("confirm");
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!normalizeName(bookerName)) next.name = "Enter your name.";
    if (!normalizeEmail(bookerEmail)) next.email = "Enter a valid email address.";
    if (engine.active && !bookerPhone.trim()) next.phone = "Enter a phone number.";
    if (forWhom.kind === "other" && !normalizeName(forWhom.name)) next.attendee = "Enter the guest's name.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Unconnected (or flag-off) providers keep today's simulator behaviour byte-for-byte —
    // see src/lib/booking/engine-flag.ts: a drawer that shows real availability but can't
    // actually save a booking is worse than the honest simulator.
    if (!engine.active || !engine.selectedBranch) {
      setStep("done");
      toast.success("Booking confirmed", {
        description: `${provider.name} · ${dateLabel(activeISO)} at ${time}`,
      });
      return;
    }

    if (!user) {
      openLogin("booking");
      return;
    }

    const slot = slots.find((s) => s.label === time);
    if (!slot) {
      toast.error("That time is no longer available. Please pick another.");
      return;
    }
    const hh = String(Math.floor(slot.minutes / 60)).padStart(2, "0");
    const mm = String(slot.minutes % 60).padStart(2, "0");

    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerSlug: provider.slug,
          branchId: engine.selectedBranch.id,
          serviceId: firstSelectedId,
          date: activeISO,
          startTime: `${hh}:${mm}:00`,
          customerName: forWhom.kind === "other" ? forWhom.name.trim() : bookerName.trim(),
          customerPhone: bookerPhone.trim(),
          specialRequests: guest.notes || null,
          clientRequestId: idempotencyKeyRef.current,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        toast.error(bookingErrorMessage(json?.errorCode, json?.message));
        return;
      }
      setStep("done");
      toast.success("Booking confirmed", {
        description: `${provider.name} · ${dateLabel(activeISO)} at ${time}`,
      });
    } catch {
      toast.error(bookingErrorMessage("UNREACHABLE", undefined));
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    closeBooking();
    idempotencyKeyRef.current = null;
    // Let the exit animation play before the content resets underneath it.
    window.setTimeout(() => {
      resetBooking();
      setGuest({ notes: "" });
    }, 300);
  };

  const canContinue =
    (step === "services" && selectedIds.length > 0) || (step === "time" && Boolean(time));

  return (
    <AnimatePresence>
      {bookingOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={step === "done" ? finish : closeBooking}
            className="fixed inset-0 z-50 bg-foreground/40"
          />
          <motion.div
            key="panel"
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Book ${provider.name}`}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: EASE_STANDARD }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[var(--radius-lg)] bg-card text-card-foreground shadow-[var(--shadow-modal)] focus:outline-none lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[460px] lg:rounded-none lg:rounded-l-[var(--radius-lg)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                {step !== STEPS[0]?.id && step !== "done" && (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label="Back"
                    className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <ChevronLeftIcon />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {step === "done" ? "All set" : `Step ${stepIndex + 1} of ${STEPS.length}`}
                  </p>
                  <h2 className="truncate text-lg font-semibold">{provider.name}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={step === "done" ? finish : closeBooking}
                aria-label="Close booking"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <CloseIcon />
              </button>
            </div>

            {step !== "done" && (
              <ol className="flex gap-1 px-6 pt-4" aria-label="Booking steps">
                {STEPS.map((s, i) => (
                  <li key={s.id} className="flex-1">
                    <span
                      className={`block h-1 rounded-[var(--radius-full)] transition-colors duration-250 ${
                        i <= stepIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                    <span
                      className={`mt-1.5 block text-xs ${
                        i === stepIndex ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {step === "location" && (
                <div className="flex flex-col gap-6">
                  <section aria-label="Choose a location">
                    <h3 className="text-base font-semibold">Choose a location</h3>
                    {!engine.branchesLoaded ? (
                      <p className="mt-3 text-sm text-muted-foreground">Loading locations…</p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-2">
                        {engine.branches.map((branch) => (
                          <li key={branch.id}>
                            <button
                              type="button"
                              onClick={() => pickLocation(branch)}
                              className="flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-md)] border border-border p-4 text-left transition-colors duration-150 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <span className="text-sm font-semibold">{branch.name}</span>
                              {branch.address && <span className="text-sm text-muted-foreground">{branch.address}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}

              {step === "services" && (
                <div className="flex flex-col gap-6">
                  {engine.active && !engine.servicesLoaded ? (
                    <p className="text-sm text-muted-foreground">Loading services…</p>
                  ) : null}
                  {engine.active && (
                    <p className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">
                      One service per booking for now — book additional services separately.
                    </p>
                  )}
                  {visibleCategories.map((category) => {
                    const rows = visibleServices.filter((s) => s.category === category);
                    if (rows.length === 0) return null;
                    return (
                      <section key={category} aria-label={category}>
                        <h3 className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {category}
                        </h3>
                        <ul className="mt-2 flex flex-col gap-2">
                          {rows.map((service) => {
                            const checked = selectedIds.includes(service.id);
                            // Engine-connected providers book one service at a time —
                            // public_create_booking (migration-335) has no multi-service path;
                            // book-spa's own createBookingGroup is what two services becomes
                            // (Step 3's group RPC). Picking a new one here replaces the
                            // selection instead of adding to it.
                            const selectThis = () =>
                              engine.active ? chooseService(checked ? "" : service.id) : toggleService(service.id);
                            return (
                              <li key={service.id}>
                                <button
                                  type="button"
                                  aria-pressed={checked}
                                  onClick={selectThis}
                                  className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                    checked ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                                      engine.active ? "rounded-[var(--radius-full)]" : "rounded-[var(--radius-sm)]"
                                    } ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                                  >
                                    {checked &&
                                      (engine.active ? (
                                        <span className="h-2 w-2 rounded-[var(--radius-full)] bg-primary-foreground" />
                                      ) : (
                                        <CheckIcon width={14} height={14} strokeWidth={2} />
                                      ))}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline justify-between gap-3">
                                      <span className="text-sm font-semibold">{service.name}</span>
                                      <span className="font-mono text-sm tabular-nums"><Price amount={service.price} engineProviderId={provider.engineProviderId} /></span>
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                      {formatDuration(service.durations)}
                                    </span>
                                    <span className="mt-1 block text-sm text-muted-foreground">
                                      {service.description}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}

              {step === "time" && (
                <div className="flex flex-col gap-6">
                  <section aria-label="Choose a date">
                    <h3 className="text-base font-semibold">Choose a day</h3>
                    {bounds && activeISO && (
                      <MonthCalendar
                        selectedISO={activeISO}
                        minISO={bounds.minISO}
                        maxISO={bounds.maxISO}
                        onSelect={(iso) => {
                          setDateISO(iso);
                          setTime(null);
                        }}
                      />
                    )}
                  </section>

                  <section aria-label="Choose a time">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-semibold">Choose a time</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration([totalMinutes])} total
                      </p>
                    </div>
                    {slots.length === 0 ? (
                      <p className="mt-3 rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">
                        No times left on this day. Try another date.
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {slots.map((slot) => {
                          const active = time === slot.label;
                          return (
                            <button
                              key={slot.minutes}
                              type="button"
                              disabled={!slot.available}
                              aria-pressed={active}
                              onClick={() => setTime(slot.label)}
                              className={`rounded-[var(--radius-sm)] border px-2 py-2.5 text-sm tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : slot.available
                                    ? "border-border hover:border-foreground/40"
                                    : "cursor-not-allowed border-transparent bg-muted text-muted-foreground/60 line-through"
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {step === "confirm" && (
                <form id="booking-confirm-form" onSubmit={confirm} noValidate className="flex flex-col gap-6">
                  <SummaryBlock
                    provider={provider.name}
                    services={selectedServices.map((s) => s.name)}
                    when={`${dateLabel(activeISO)} · ${time}`}
                    total={totalPrice}
                    minutes={totalMinutes}
                    engineProviderId={provider.engineProviderId}
                  />

                  {!user && (
                    <p className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm">
                      <span className="text-muted-foreground">Have an account?</span>
                      <button
                        type="button"
                        onClick={() => openLogin("booking")}
                        className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        Log in
                      </button>
                    </p>
                  )}

                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-medium">Booking for</legend>
                    <div className="grid grid-cols-2 rounded-[var(--radius-md)] bg-muted p-1 text-sm font-medium">
                      {(["me", "other"] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          aria-pressed={forWhom.kind === kind}
                          onClick={() => {
                            setForWhom(kind === "me" ? { kind: "me" } : { kind: "other", name: "" });
                            setErrors((e) => ({ ...e, attendee: undefined }));
                          }}
                          className={`h-10 rounded-[var(--radius-sm)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            forWhom.kind === kind
                              ? "bg-card text-foreground shadow-[var(--shadow-low)]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {kind === "me" ? "Me" : "Someone else"}
                        </button>
                      ))}
                    </div>
                    {forWhom.kind === "other" && (
                      <>
                        <Field
                          id="attendee-name"
                          label="Guest's full name"
                          value={forWhom.name}
                          error={errors.attendee}
                          autoComplete="off"
                          onChange={(v) => setForWhom({ kind: "other", name: v })}
                        />
                        <p className="text-xs text-muted-foreground">You stay the booker and get the confirmation.</p>
                      </>
                    )}
                  </fieldset>

                  <div className="flex flex-col gap-4">
                    <Field
                      id="guest-name"
                      label={forWhom.kind === "other" ? "Your full name" : "Full name"}
                      value={bookerName}
                      error={errors.name}
                      autoComplete="name"
                      onChange={(v) => setGuest((g) => ({ ...g, name: v }))}
                    />
                    <Field
                      id="guest-email"
                      label={forWhom.kind === "other" ? "Your email" : "Email"}
                      type="email"
                      value={bookerEmail}
                      error={errors.email}
                      autoComplete="email"
                      onChange={(v) => setGuest((g) => ({ ...g, email: v }))}
                    />
                    {engine.active && (
                      <Field
                        id="guest-phone"
                        label="Phone number"
                        type="tel"
                        value={bookerPhone}
                        error={errors.phone}
                        autoComplete="tel"
                        onChange={(v) => setGuest((g) => ({ ...g, phone: v }))}
                      />
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="guest-notes" className="text-sm font-medium">
                        Notes for the studio <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <textarea
                        id="guest-notes"
                        rows={3}
                        value={guest.notes}
                        onChange={(e) => setGuest((g) => ({ ...g, notes: e.target.value }))}
                        className="rounded-[var(--radius-sm)] border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                    </div>
                  </div>

                  <p className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">
                    You pay at the studio. Free cancellation until 24 hours before your visit.
                  </p>
                </form>
              )}

              {step === "done" && (
                <div className="flex flex-col items-center gap-5 py-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-primary text-primary-foreground">
                    <CheckIcon width={26} height={26} strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-2xl font-semibold">You&apos;re booked in</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {forWhom.kind === "other" ? `Booked for ${forWhom.name.trim()}. ` : ""}A confirmation would be sent to {bookerEmail}.
                    </p>
                  </div>
                  <div className="w-full text-left">
                    <SummaryBlock
                      provider={provider.name}
                      services={selectedServices.map((s) => s.name)}
                      when={`${dateLabel(activeISO)} · ${time}`}
                      total={totalPrice}
                      minutes={totalMinutes}
                      engineProviderId={provider.engineProviderId}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {engine.active
                      ? "The studio has received your booking."
                      : "Demo booking. Nothing was sent or saved, since this site is not connected to a live booking system yet."}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {step === "done" ? (
                <button
                  type="button"
                  onClick={finish}
                  className="h-12 w-full rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Done
                </button>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {selectedServices.length === 0
                        ? "No services selected"
                        : `${selectedServices.length} service${selectedServices.length > 1 ? "s" : ""} · ${formatDuration([totalMinutes])}`}
                    </p>
                    <p className="font-mono text-lg font-semibold tabular-nums"><Price amount={totalPrice} engineProviderId={provider.engineProviderId} /></p>
                  </div>
                  {step === "confirm" ? (
                    <button
                      key="confirm"
                      type="submit"
                      form="booking-confirm-form"
                      disabled={submitting}
                      className="h-12 min-w-36 rounded-[var(--radius-md)] bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Booking…" : "Confirm booking"}
                    </button>
                  ) : (
                    <button
                      key="continue"
                      type="button"
                      onClick={goNext}
                      disabled={!canContinue}
                      className="h-12 min-w-36 rounded-[var(--radius-md)] bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                      Continue
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Month grid (Sunday first) with prev/next month; days outside [minISO, maxISO] are disabled. */
function MonthCalendar({
  selectedISO,
  minISO,
  maxISO,
  onSelect,
}: {
  selectedISO: string;
  minISO: string;
  maxISO: string;
  onSelect: (iso: string) => void;
}) {
  const [view, setView] = useState(() => {
    const d = fromISO(selectedISO);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const first = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const min = fromISO(minISO);
  const max = fromISO(maxISO);
  const canPrev = view.year * 12 + view.month > min.getFullYear() * 12 + min.getMonth();
  const canNext = view.year * 12 + view.month < max.getFullYear() * 12 + max.getMonth();
  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const navButton =
    "flex h-9 w-9 items-center justify-center rounded-[var(--radius-full)] border border-border transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="mt-3 rounded-[var(--radius-md)] border border-border p-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month" className={navButton}>
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month" className={navButton}>
          <ChevronRightIcon width={18} height={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((label, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="pb-1 font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
          >
            {label}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const iso = toISO(new Date(view.year, view.month, day));
          const disabled = iso < minISO || iso > maxISO;
          const selected = iso === selectedISO;
          const today = iso === minISO;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={fromISO(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              onClick={() => onSelect(iso)}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] text-sm tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : disabled
                    ? "text-muted-foreground/40"
                    : `hover:bg-muted ${today ? "font-semibold ring-1 ring-inset ring-primary" : ""}`
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  return fromISO(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function SummaryBlock({
  provider,
  services,
  when,
  total,
  minutes,
  engineProviderId,
}: {
  provider: string;
  services: string[];
  when: string;
  total: number;
  minutes: number;
  engineProviderId?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <StarIcon width={14} height={14} className="text-warning" />
        {provider}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{when}</p>
      <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
        {services.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{formatDuration([minutes])}</span>
        <span className="font-mono text-base font-semibold tabular-nums"><Price amount={total} engineProviderId={engineProviderId} /></span>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        maxLength={254}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 rounded-[var(--radius-sm)] border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          error ? "border-error" : "border-border"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
