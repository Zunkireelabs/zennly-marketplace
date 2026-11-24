"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-provider";
import { EmailChangeDialog } from "@/components/account/email-change-dialog";

/**
 * Account-level actions, as opposed to profile *data* (which lives in /account/profile).
 *
 * Changing the sign-in email is a two-code flow (one to each address) -- see
 * email-change-dialog.tsx for why both are required and what the server cannot tell the UI about
 * which code is already spent.
 */
export default function AccountSettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account, not your details.</p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Sign-in email</h2>
        <p className="mt-1 text-sm text-foreground">{user?.email ?? "—"}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This is how you sign in, and how we find your bookings at each studio — changing it
          changes which visits we can show you.
        </p>
        <EmailChangeDialog />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Sign out</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You&rsquo;ll stay signed out on this device until you log in again.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 h-11 rounded-[var(--radius-md)] border border-border px-5 text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Sign out
        </button>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Download my data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A file with your profile, saved studios, consent choices and activity that Zennly holds.
          Bookings stay with the studios, so they aren&rsquo;t in it.
        </p>
        <a
          href="/api/account/export"
          download
          className="mt-4 inline-flex h-11 items-center rounded-[var(--radius-md)] border border-border px-5 text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Download my data
        </a>
      </div>

      <DeleteAccount />
    </section>
  );
}

/**
 * Two-step by design, and the second step requires typing the word rather than clicking again:
 * this removes the profile, saved studios, consents and activity, and the Supabase auth user
 * itself. It is not undoable and there is no trash to recover from.
 *
 * What it does NOT remove, and says so: bookings live in each studio's own system, not ours. A
 * customer deleting their Zennly account has not cancelled their appointment at Nuad Thai, and
 * implying otherwise would be the more dangerous misunderstanding of the two.
 */
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const confirmed = typed.trim().toLowerCase() === "delete";

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        toast.error("We couldn't delete your account just now. Nothing has been removed.");
        setBusy(false);
        return;
      }
      // A FULL reload, deliberately — not router.push(). The account this tab's client state
      // describes no longer exists: the auth store, the saved-studio store and the account
      // context all still hold that user's data in memory, and a client-side navigation keeps
      // every one of them. Tearing the document down is the only way to guarantee none of a
      // deleted account's data survives in the tab.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch {
      toast.error("We couldn't delete your account just now. Nothing has been removed.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-error/30 bg-card p-5">
      <h2 className="font-semibold text-foreground">Delete account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Removes your profile, saved studios and activity from Zennly, permanently. This
        can&rsquo;t be undone.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Your bookings stay with the studios themselves — deleting this account doesn&rsquo;t cancel
        an appointment. Contact the studio directly for that.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 h-11 rounded-[var(--radius-md)] border border-error/40 px-5 text-sm font-semibold text-error transition-colors duration-150 hover:bg-error/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label htmlFor="confirm-delete" className="text-sm text-foreground">
            Type <span className="font-mono font-semibold">delete</span> to confirm.
          </label>
          <input
            id="confirm-delete"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="h-11 w-full max-w-xs rounded-[12px] border border-border bg-card px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!confirmed || busy}
              onClick={() => void run()}
              className="h-11 rounded-[var(--radius-md)] bg-error px-5 text-sm font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="h-11 rounded-[var(--radius-md)] border border-border px-5 text-sm font-semibold transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
