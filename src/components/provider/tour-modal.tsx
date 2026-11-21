"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { CheckIcon, CloseIcon } from "./icons";
import { useProviderUi } from "./provider-shell";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

const EMPTY = { name: "", email: "", question: "" };

/**
 * Virtual tour. Plays openly (no lead gate): the tour is the pitch, "Book a trial class" is the
 * main action, and "Ask the studio" is an optional, low-friction way to leave contact details.
 * Showcase-only: the form sends nothing anywhere (docs/PRODUCT_CONTEXT.md §4).
 */
export function TourModal() {
  const { provider, availability, tourOpen, closeTour, openBooking } = useProviderUi();
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [sent, setSent] = useState(false);
  const tour = provider.tour;

  useEffect(() => {
    if (!tourOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [tourOpen, closeTour]);

  if (!tour) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSent(true);
    toast.success("Message sent", { description: `${provider.name} will reply to ${form.email}.` });
  };

  const bookInstead = () => {
    closeTour();
    openBooking();
  };

  const close = () => {
    closeTour();
    // Let the exit animation play before the form resets underneath it.
    window.setTimeout(() => {
      setForm(EMPTY);
      setErrors({});
      setSent(false);
    }, 300);
  };

  return (
    <AnimatePresence>
      {tourOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${provider.name} virtual tour`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_STANDARD }}
          onClick={close}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/80 p-0 sm:items-center sm:p-6"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: EASE_STANDARD }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-y-auto rounded-t-[var(--radius-lg)] bg-card text-card-foreground shadow-[var(--shadow-modal)] sm:rounded-[var(--radius-lg)] lg:flex-row lg:overflow-hidden"
          >
            <div className="bg-foreground lg:flex-1">
              {tour.embedUrl ? (
                <iframe
                  src={tour.embedUrl}
                  title={`${provider.name} 3D tour`}
                  allow="fullscreen; xr-spatial-tracking"
                  className="aspect-video h-full w-full lg:min-h-[520px]"
                />
              ) : (
                <video
                  src={tour.video}
                  poster={tour.poster}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="aspect-video h-full w-full object-cover lg:min-h-[520px]"
                />
              )}
            </div>

            <div className="flex flex-col gap-6 p-6 lg:w-[380px] lg:shrink-0 lg:overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Virtual tour · {tour.duration}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{provider.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {provider.modality} in {provider.city}
                  </p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="Close virtual tour"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <CloseIcon />
                </button>
              </div>

              {availability.state === "live" && (
              <button
                type="button"
                onClick={bookInstead}
                className="h-12 w-full rounded-[var(--radius-md)] bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Book a trial class
              </button>
              )}

              <div className="border-t border-border pt-5">
                <h3 className="text-base font-semibold">Ask the studio</h3>
                {sent ? (
                  <div className="mt-3 flex items-start gap-3 rounded-[var(--radius-md)] bg-muted px-4 py-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-primary text-primary-foreground">
                      <CheckIcon width={12} height={12} strokeWidth={2} />
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Thanks {form.name.split(" ")[0]}. A reply would go to {form.email}. Demo only: nothing was
                      sent or saved.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-3">
                    <TourField
                      id="tour-name"
                      label="Name"
                      value={form.name}
                      error={errors.name}
                      autoComplete="name"
                      onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                    />
                    <TourField
                      id="tour-email"
                      label="Email"
                      type="email"
                      value={form.email}
                      error={errors.email}
                      autoComplete="email"
                      onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="tour-question" className="text-sm font-medium">
                        Question <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <textarea
                        id="tour-question"
                        rows={2}
                        value={form.question}
                        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                        className="rounded-[var(--radius-sm)] border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-11 w-full rounded-[var(--radius-md)] border border-border text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Send message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TourField({
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
