"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { normalizeName } from "@/lib/auth/normalize";
import { clearResume, slotStillOffered } from "@/lib/booking/booking-resume";
import { earliestMissingStep } from "@/lib/booking/booking-route";
import { timeToMinutes } from "@/lib/booking/engine-availability";
import { changeOrCancelText, unknownOutcomeMessage } from "@/lib/booking/engine-errors";
import type { ForWhom } from "@/lib/booking/start-booking";
import { LockIcon } from "@/components/provider/icons";
import { dateLabel, Field } from "@/components/provider/booking-drawer";
import { Notice, StepHeader, SummaryPanel } from "./ui";
import { useBookFlow } from "./flow";

const FORM_ID = "booking-confirm-form";

/** ④ Confirm. A logged-out customer logs in first (their choices are in the URL, so nothing is lost). */
export function ConfirmStep() {
  const { provider, engine, params, service, days, studioPhone, submitting, confirmError, outcomeUnknown, locked, booked, submit, rememberForLogin, go } =
    useBookFlow();
  const { user, ready, openLogin } = useAuth();
  const [guest, setGuest] = useState<{ name?: string; phone?: string; notes: string }>({ notes: "" });
  const [forWhom, setForWhom] = useState<ForWhom>({ kind: "me" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; attendee?: string }>({});
  const name = guest.name ?? user?.name ?? "";
  const phone = guest.phone ?? "";
  const needsLogin = ready && !user;
  const branch = engine.selectedBranch;

  // Choices missing from the URL: back to the step that lacks one.
  useEffect(() => {
    if (!engine.branchesLoaded || locked || booked) return;
    const missing = earliestMissingStep(params);
    if (missing !== "confirm") go(missing, params, "replace");
  }, [engine.branchesLoaded, params, go, locked, booked]);

  // Back from a login that left the page (Google): the saved choices have done their job.
  useEffect(() => {
    if (user) clearResume();
  }, [user]);

  // The time must still be on offer (someone may have taken it, or we came back from a login).
  // If not, say so on the time step rather than letting the booking fail at the end.
  useEffect(() => {
    if (!days || !params.date || !params.time || !branch || !service || locked || booked || submitting) return;
    const day = days.find((d) => d.date === params.date);
    const daySlots = day && !day.isClosed ? day.slots.map((s) => ({ minutes: timeToMinutes(s.time24), available: s.isAvailable })) : null;
    if (!slotStillOffered(daySlots, timeToMinutes(params.time))) {
      go("time", { branch: branch.id, service: service.id, date: params.date, notice: "gone" }, "replace");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const slot = days?.find((d) => d.date === params.date)?.slots.find((s) => params.time && timeToMinutes(s.time24) === timeToMinutes(params.time));
  const when = params.date && slot ? `${dateLabel(params.date)} · ${slot.time12}` : null;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      rememberForLogin();
      openLogin("booking");
      return;
    }
    const next: typeof errors = {};
    if (!normalizeName(name)) next.name = "Enter your name.";
    if (!phone.trim()) next.phone = "Enter a phone number.";
    if (forWhom.kind === "other" && !normalizeName(forWhom.name)) next.attendee = "Enter the guest's name.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await submit({ name, phone, notes: guest.notes }, forWhom.kind === "other" ? forWhom.name.trim() : null);
  };

  const label = submitting ? "Booking…" : needsLogin ? "Log in to book" : "Confirm booking";
  const actionDisabled = submitting || outcomeUnknown || !ready;

  return (
    <div className="flex flex-col gap-8">
      <StepHeader step="confirm" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-6 pb-24 lg:pb-0">
          <h2 className="text-2xl font-semibold">Confirm your booking</h2>

          {needsLogin && (
            <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border p-4 text-sm">
              <p className="font-semibold">Log in to confirm your booking</p>
              <p className="text-muted-foreground">
                We book with your account&apos;s email and phone so the studio can reach you. Your choices are kept.
              </p>
            </div>
          )}

          {!needsLogin && (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Booking for</legend>
                <div className="grid grid-cols-2 rounded-[var(--radius-md)] bg-muted p-1 text-sm font-medium">
                  {(["me", "other"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      disabled={locked}
                      aria-pressed={forWhom.kind === kind}
                      onClick={() => {
                        setForWhom(kind === "me" ? { kind: "me" } : { kind: "other", name: "" });
                        setErrors((e) => ({ ...e, attendee: undefined }));
                      }}
                      className={`h-10 rounded-[var(--radius-sm)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        forWhom.kind === kind ? "bg-card text-foreground shadow-[var(--shadow-low)]" : "text-muted-foreground hover:text-foreground"
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
                  value={name}
                  error={errors.name}
                  autoComplete="name"
                  onChange={(v) => setGuest((g) => ({ ...g, name: v }))}
                />
                {user?.email && (
                  <div className="flex flex-col gap-1.5">
                    <span id="guest-email-label" className="text-sm font-medium">
                      {forWhom.kind === "other" ? "Your account email" : "Account email"}
                    </span>
                    {/* Not an input: it can't be edited or focused as a text box. */}
                    <p
                      aria-labelledby="guest-email-label"
                      className="flex h-11 items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-muted px-3 text-sm text-muted-foreground"
                    >
                      <span className="min-w-0 truncate">{user.email}</span>
                      <LockIcon aria-hidden="true" width={16} height={16} className="shrink-0" />
                    </p>
                  </div>
                )}
                <Field
                  id="guest-phone"
                  label="Phone number"
                  type="tel"
                  value={phone}
                  error={errors.phone}
                  autoComplete="tel"
                  onChange={(v) => setGuest((g) => ({ ...g, phone: v }))}
                />
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
            </>
          )}

          <Notice>You pay at the studio. {changeOrCancelText(studioPhone)}</Notice>
          {outcomeUnknown && <Notice tone="error" role="alert">{unknownOutcomeMessage(branch?.name ?? provider.name, studioPhone)}</Notice>}
          {confirmError && !outcomeUnknown && <Notice tone="error" role="alert">{confirmError}</Notice>}
        </form>
        <SummaryPanel
          when={when}
          form={FORM_ID}
          actionLabel={label}
          disabled={actionDisabled}
        />
      </div>
    </div>
  );
}
