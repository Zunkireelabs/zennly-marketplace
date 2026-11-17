"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { auth, type AuthError, type CodeTarget } from "@/lib/auth";
import { useAuth, type LoginReason } from "@/lib/auth/auth-provider";
import { COUNTRIES, DEFAULT_COUNTRY, maskTarget } from "@/lib/auth/normalize";
import { CloseIcon } from "@/components/provider/icons";

const SUBTITLE: Record<LoginReason, string> = {
  login: "Keep your saved studios and book faster.",
  save: "Log in to keep your saved studios on every device.",
  booking: "Log in to book with a verified phone or email.",
};

const FIELD =
  "h-12 rounded-[14px] border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const PRIMARY_BTN =
  "h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

export function LoginDialog() {
  const { loginOpen, loginReason, closeLogin } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);

  // A native modal <dialog> gives a focus trap, Escape to close, inert page behind it and
  // focus return for free.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (loginOpen && !dialog.open) dialog.showModal();
    if (!loginOpen && dialog.open) dialog.close();
  }, [loginOpen]);

  // A modal <dialog> makes the page inert but does not stop it scrolling. Lock the page while the
  // dialog is open, and pad for the vanishing scrollbar so nothing shifts sideways.
  useEffect(() => {
    if (!loginOpen) return;
    const root = document.documentElement;
    const { overflow, paddingRight } = root.style;
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = overflow;
      root.style.paddingRight = paddingRight;
    };
  }, [loginOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="login-title"
      onClose={closeLogin}
      onClick={(e) => {
        if (e.target === ref.current) closeLogin();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[28px] bg-card p-0 md:max-w-4xl text-card-foreground shadow-[var(--shadow-modal)] overscroll-contain backdrop:bg-foreground/60 backdrop:backdrop-blur-[2px]"
    >
      {loginOpen && <LoginForm reason={loginReason} onDone={closeLogin} />}
    </dialog>
  );
}

type Step =
  | { kind: "start" }
  | { kind: "code"; target: CodeTarget; cooldownUntil: number };

function LoginForm({
  reason,
  onDone,
}: {
  reason: LoginReason;
  onDone: () => void;
}) {
  const unavailable = auth.name === "unavailable";
  const [method, setMethod] = useState<"phone" | "email">("email");
  const [dial, setDial] = useState(DEFAULT_COUNTRY.code);
  const [national, setNational] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>({ kind: "start" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const country = COUNTRIES.find((c) => c.code === dial) ?? DEFAULT_COUNTRY;

  // Ticks only while a resend cooldown is running.
  const cooldownUntil = step.kind === "code" ? step.cooldownUntil : 0;
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownUntil) window.clearInterval(id);
    }, 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const finish = (how: "phone" | "email" | "google") => {
    track("login_completed", { method: how });
    toast.success("You're signed in");
    onDone();
  };

  // Email-link mode: the person clicks the emailed link (usually a new tab, same browser), which
  // sets the session cookie. Re-check it while this screen waits, and finish once it appears.
  const { user } = useAuth();
  const linkMode =
    step.kind === "code" &&
    step.target.kind === "email" &&
    auth.emailMethod === "link";
  const finished = useRef(false);
  useEffect(() => {
    if (!linkMode) return;
    const check = () => void auth.refresh();
    const id = window.setInterval(check, 3000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [linkMode]);
  useEffect(() => {
    if (linkMode && user && !finished.current) {
      finished.current = true;
      track("login_completed", { method: "email" });
      toast.success("You're signed in");
      onDone();
    }
  }, [linkMode, user, onDone]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const result =
      method === "phone"
        ? await auth.signInWithPhone(country.dial, national)
        : await auth.signInWithEmail(email);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setCode("");
    setNow(Date.now());
    setStep({
      kind: "code",
      target: result.data,
      cooldownUntil: Date.now() + 30_000,
    });
  };

  const verify = async (target: CodeTarget) => {
    setBusy(true);
    setError(null);
    const result = await auth.verifyCode(target, code);
    setBusy(false);
    if (!result.ok) {
      setCode("");
      return setError(result.error);
    }
    finish(target.kind);
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    const result = await auth.signInWithGoogle();
    setBusy(false);
    if (!result.ok) return setError(result.error);
    finish("google");
  };

  const back = () => {
    setStep({ kind: "start" });
    setError(null);
    setCode("");
  };

  return (
    <div className="grid md:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] md:gap-3 md:p-3">
      {/* Brand panel: desktop only. A quiet photo and one line, nothing competing with the form. */}
      <aside className="relative hidden min-h-[34rem] overflow-hidden rounded-[20px] md:block">
        <Image
          src="/images/mood/unwind-quiet-room.jpg"
          alt=""
          fill
          sizes="368px"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <p className="font-serif text-4xl leading-[1.05]">
            Time for stillness.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Curated studios. Real reviews. Book in seconds.
          </p>
        </div>
      </aside>

      <div className="relative flex flex-col p-6 sm:p-10 md:px-9 md:py-8">
        <button
          type="button"
          onClick={onDone}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CloseIcon />
        </button>

        <Image
          src="/images/brand/zennly-logo.png"
          alt="Zennly"
          width={467}
          height={157}
          className="h-7 w-auto self-start"
        />

        <div className="mt-10">
          <p className="text-sm text-muted-foreground">Log in or sign up</p>
          <h2
            id="login-title"
            className="mt-1 font-serif text-4xl leading-[1.05] sm:text-[2.75rem]"
          >
            {step.kind === "code"
              ? linkMode
                ? "Check your email"
                : "Enter your code"
              : "Welcome to Zennly"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {step.kind === "code"
              ? linkMode
                ? `We sent a sign-in link to ${maskTarget(step.target.kind, step.target.value)}.`
                : `We sent a 6-digit code to ${maskTarget(step.target.kind, step.target.value)}.`
              : SUBTITLE[reason]}
          </p>
        </div>

        {unavailable ? (
          <p className="mt-6 rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">
            Sign in isn&apos;t available yet. You can still browse, save and
            book as a guest.
          </p>
        ) : step.kind === "start" ? (
          <form
            noValidate
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            {auth.supportsPhone && (
              <div
                role="tablist"
                aria-label="Sign in with"
                className="grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-medium"
              >
                {(["phone", "email"] as const).map((m) => {
                  // Phone sign-in isn't wired yet (supabase-adapter.ts's signInWithPhone always
                  // returns "unavailable") — shown so people know it's planned, but disabled
                  // rather than letting them fill in a number and fail at submit.
                  const comingSoon = m === "phone";
                  return (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={method === m}
                      disabled={comingSoon}
                      onClick={() => {
                        setMethod(m);
                        setError(null);
                      }}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        method === m
                          ? "bg-card text-foreground shadow-[var(--shadow-low)]"
                          : comingSoon
                            ? "cursor-not-allowed text-muted-foreground/40"
                            : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "phone" ? "Phone" : "Email"}
                      {comingSoon && (
                        <span className="rounded-[var(--radius-full)] bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-accent-foreground">
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {method === "phone" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-phone" className="text-sm font-medium">
                  Phone number
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Country code"
                    value={dial}
                    onChange={(e) => setDial(e.target.value)}
                    className={`${FIELD} w-[7.5rem] shrink-0 px-2`}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    autoFocus
                    maxLength={32}
                    value={national}
                    onChange={(e) => setNational(e.target.value)}
                    placeholder={
                      country.dial === "+977" ? "98XXXXXXXX" : "Phone number"
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    className={`${FIELD} min-w-0 flex-1`}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  className={FIELD}
                />
              </div>
            )}

            <ErrorLine error={error} />
            <BotCheckSlot />

            <button type="submit" disabled={busy} className={PRIMARY_BTN}>
              {busy ? "Sending…" : "Continue"}
            </button>

            <div
              className="flex items-center gap-3 text-xs text-muted-foreground"
              aria-hidden
            >
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={() => void google()}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </form>
        ) : linkMode ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-muted-foreground">
              Open the email and click the link to sign in. Use the same
              browser. This screen updates by itself. Can&apos;t find it? Check
              your spam folder.
            </p>
            <ErrorLine error={error} />
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={back}
                className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Use a different method
              </button>
              <button
                type="button"
                disabled={busy || secondsLeft > 0}
                onClick={() => void sendCode()}
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend link"}
              </button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void verify(step.target);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-code" className="text-sm font-medium">
                6-digit code
              </label>
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                pattern="[0-9]*"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className={`${FIELD} text-center font-mono text-2xl tracking-[0.5em]`}
              />
            </div>

            <ErrorLine error={error} />

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className={PRIMARY_BTN}
            >
              {busy ? "Checking…" : "Verify"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={back}
                className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Use a different method
              </button>
              <button
                type="button"
                disabled={busy || secondsLeft > 0}
                onClick={() => void sendCode()}
                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {auth.demoHint && (
          <p className="mt-5 rounded-[var(--radius-sm)] border border-dashed border-warning/60 px-3 py-2 text-xs text-muted-foreground">
            {auth.demoHint}
          </p>
        )}

        <p className="mt-auto pt-10 text-xs leading-relaxed text-muted-foreground">
          Browsing never needs an account. We only ask when you save or book.
        </p>
      </div>
    </div>
  );
}

function ErrorLine({ error }: { error: AuthError | null }) {
  return (
    <p
      id="login-error"
      role="alert"
      className="min-h-5 text-sm leading-5 text-error"
    >
      {error ? errorCopy(error) : null}
    </p>
  );
}

function errorCopy(error: AuthError): string {
  if (error.code === "invalid_code" && error.attemptsLeft !== undefined) {
    return `${error.message} ${error.attemptsLeft} ${error.attemptsLeft === 1 ? "try" : "tries"} left.`;
  }
  if (error.code === "cooldown" || error.code === "locked") {
    const seconds = Math.ceil((error.retryAfterMs ?? 0) / 1000);
    return seconds > 0 ? `${error.message} (${seconds}s)` : error.message;
  }
  return error.message;
}

/**
 * Reserved for the bot check (Turnstile or similar) that arrives with real OTP in Phase 2. It
 * renders nothing now; keeping the slot here fixes where the widget goes and what it gates.
 */
function BotCheckSlot() {
  return <div data-slot="bot-check" className="empty:hidden" />;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
