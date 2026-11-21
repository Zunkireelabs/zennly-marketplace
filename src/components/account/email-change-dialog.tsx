"use client";

import { useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { useAuth } from "@/lib/auth/auth-provider";
import { maskTarget, normalizeEmail } from "@/lib/auth/normalize";
import { fieldClass } from "@/components/ui/field";
import { nextStep, type Step } from "@/lib/account/email-change-steps";

const FIELD = fieldClass();
const CODE_FIELD = fieldClass({ code: true });

const PRIMARY =
  "h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SECONDARY =
  "h-11 rounded-[var(--radius-md)] border border-border px-5 text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Changing the sign-in email. Two codes, one to each address, because these customers have no
 * password — there is nothing to re-authenticate with, so a code to the address already on file is
 * what stands in for it. ("Secure email change" is ON for this project; the server routes assume
 * it.)
 *
 * ## Why this is one input at a time, in order
 *
 * Both codes are sent the instant the change is requested — Supabase offers no way to hold the
 * second one back. But the owner wants the *asking* to run turn by turn: confirm the old address
 * first, then the new one. The old address's code is the real proof of ownership, so asking for
 * it first and showing the new-address box only after is purely presentational — `nextStep()` in
 * `email-change-steps.ts` is what actually enforces the order.
 *
 * ## What cannot be known, and what the UI does about it
 *
 * GoTrue exposes no per-leg progress: `auth.users.new_email` says a change is pending, but NOT
 * which of the two codes is already spent. So after a reload (or on another device) we can honestly
 * say "a change to this address is pending" and nothing more — hence `step` is local state that
 * resets to `current` on reload, with a quiet escape link to skip to step 2 for anyone who already
 * entered the first code before reloading. **Start over** stays the recovery path for everything
 * else: it re-requests the change, which issues two fresh codes and invalidates the outstanding
 * pair.
 *
 * Deliberately NOT stored in localStorage: it would be absent on another device and stale after a
 * code is spent elsewhere, i.e. it would claim to know more than we do.
 */
export function EmailChangeDialog() {
  const { user } = useAuth();
  const pending = user?.pendingEmail;

  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Resets to "current" on reload, by design — see above.
  const [step, setStep] = useState<Step>("current");

  const currentMasked = user?.email ? maskTarget("email", user.email) : "your current address";
  const newMasked = pending ? maskTarget("email", pending) : newEmail ? maskTarget("email", newEmail) : "";

  async function request(address: string, { silent = false } = {}) {
    const normalized = normalizeEmail(address);
    if (!normalized) {
      setError("Enter a valid email address.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? "We couldn't start that change. Try again.");
        return false;
      }
      setStep("current");
      await auth.refresh();
      if (!silent) toast.success("Codes sent — check both inboxes");
      return true;
    } catch {
      setError("We couldn't start that change. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function verify(address: string, code: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, code }),
      });
      const json = await res.json().catch(() => null);
      const outcome = res.ok && json?.ok ? { ok: true as const, complete: Boolean(json.data?.complete) } : { ok: false as const };
      const result = nextStep(step, outcome);

      if (!outcome.ok) {
        setError(json?.error?.message ?? result.error ?? "That code is wrong or has expired.");
        return;
      }

      setStep(result.step);
      setError(result.error ?? null);

      if (result.step !== "done") return;

      await auth.refresh();
      setOpen(false);
      setStep("current");
      setNewEmail("");
      toast.success("Email changed. You've been signed out on your other devices.");
    } catch {
      setError("That code is wrong or has expired.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Not started: the entry point on the Settings page ----
  if (!pending && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${SECONDARY} mt-4`}>
        Change email
      </button>
    );
  }

  // ---- Entering the new address ----
  if (!pending) {
    return (
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void request(newEmail);
        }}
      >
        <label htmlFor="new-email" className="text-sm font-medium text-foreground">
          New email address
        </label>
        <input
          id="new-email"
          type="email"
          autoComplete="email"
          autoFocus
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className={`${FIELD} w-full max-w-sm`}
        />
        <p className="text-sm text-muted-foreground">
          We&rsquo;ll send a code to {currentMasked} and one to the new address. You&rsquo;ll need
          both — that&rsquo;s what stops someone else moving your account.
        </p>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy || !newEmail.trim()} className={PRIMARY}>
            {busy ? "Sending…" : "Send codes"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className={SECONDARY}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // ---- One code at a time: current address first, then the new one ----
  const onCurrent = step !== "new";
  const address = onCurrent ? user?.email ?? "" : pending;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">
          {onCurrent ? "Step 1 of 2" : "Step 2 of 2"}
        </p>
        <p className="mt-1 text-muted-foreground">
          {onCurrent
            ? `We've sent a code to each address. Start with the one sent to ${currentMasked} — we'll ask for the other next.`
            : `Now enter the code sent to ${newMasked}.`}
        </p>
        <p className="mt-1 text-muted-foreground">Your email hasn&rsquo;t changed yet.</p>
      </div>

      <CodeInput
        key={step}
        id={`code-${step}`}
        label={onCurrent ? "Code from your current address" : "Code from your new address"}
        hint={onCurrent ? currentMasked : newMasked}
        busy={busy}
        onSubmit={(code) => void verify(address, code)}
      />

      {onCurrent && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setStep("new");
            setError(null);
          }}
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Already entered this one? &rarr;
        </button>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void request(pending)} className={SECONDARY}>
          Start over
        </button>
        <p className="text-xs text-muted-foreground">Sends two fresh codes and cancels the current pair.</p>
      </div>
    </div>
  );
}

function CodeInput({
  id,
  label,
  hint,
  busy,
  onSubmit,
}: {
  id: string;
  label: string;
  hint: string;
  busy: boolean;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <p className="text-xs text-muted-foreground">Sent to {hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]*"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className={`${CODE_FIELD} w-[13rem]`}
        />
        <button type="submit" disabled={busy || code.length !== 6} className={PRIMARY}>
          {busy ? "Checking…" : "Verify"}
        </button>
      </div>
    </form>
  );
}
