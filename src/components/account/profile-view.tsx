"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { useAuth } from "@/lib/auth/auth-provider";
import { COUNTRIES, DEFAULT_COUNTRY, normalizeName, normalizePhone } from "@/lib/auth/normalize";
import { profileCompleteness } from "@/lib/account/completeness";
import { bookingLine, membershipView, type LookupResult } from "@/lib/account/studio-lookup";

type ConnectedStudio = { slug: string; name: string; city: string; image: string };

/**
 * The cross-studio equivalent of book-spa's own /:orgSlug/account — except book-spa's version is
 * scoped to one spa, and the whole point of a marketplace account is that it isn't: one login,
 * one page, every connected studio the customer has history with. Today that's two studios;
 * this renders fine for however many are connected later.
 *
 * One request fans out server-side across every connected studio (see
 * src/app/api/account/studio-history/route.ts's providerSlugs path) rather than one call per
 * studio from here, so a customer with several studios doesn't wait on N round trips.
 *
 * No fabricated placeholders: a studio with nothing found renders a quiet "no visits yet" line,
 * the same honest empty state studio-history.tsx already uses on the storefront page. Vouchers,
 * referral earnings, and total-visit counts aren't available from any data source today, so they
 * simply aren't rendered — adding an empty-looking tile for data that doesn't exist yet would be
 * a different kind of dishonesty than the fabricated "Premium Club" this page is explicitly
 * avoiding.
 */
export function ProfileView({ connectedStudios }: { connectedStudios: ConnectedStudio[] }) {
  const { user, ready, openLogin } = useAuth();
  const [results, setResults] = useState<Record<string, LookupResult> | null>(null);

  useEffect(() => {
    if (!ready || !user || connectedStudios.length === 0) return;
    let cancelled = false;
    fetch("/api/account/studio-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerSlugs: connectedStudios.map((s) => s.slug) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.ok && json.data) setResults(json.data as Record<string, LookupResult>);
      })
      .catch(() => {
        // Fail soft: leave `results` null, which renders each studio's quiet loading line
        // indefinitely rather than an error. Same "never surface an error here" rule as
        // studio-history.tsx — this page is additive to having an account, not load-bearing.
      });
    return () => {
      cancelled = true;
    };
    // connectedStudios is server-derived and stable for the page's lifetime; re-keying on its
    // identity would refetch on every render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, connectedStudios.length]);

  if (!ready) {
    return <div aria-hidden className="h-96" />;
  }

  if (!user) {
    return (
      <section className="pt-6">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Your profile</h1>
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">You&rsquo;re not signed in</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Log in to see your bookings and membership across every studio you&rsquo;ve visited.
          </p>
          <button
            type="button"
            onClick={() => openLogin("login")}
            className="mt-5 inline-block rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Log in
          </button>
        </div>
      </section>
    );
  }

  // firstName (a stored field) beats name.split(" ") (derived) beats the email local-part (not a
  // name at all) — this ordering is the whole point of M1-M4: a customer who's set their name no
  // longer gets greeted by their email address.
  const greetingName = user.firstName ?? user.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <section className="pt-6">
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Welcome back, {greetingName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(" · ")}</p>

      <CompletenessPrompt />
      <ProfileEditCard />

      {connectedStudios.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-14 text-center">
          <p className="text-lg font-semibold">No connected studios yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Once a studio you&rsquo;ve booked with connects to Zennly, your visits there will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-6">
          {connectedStudios.map((studio) => (
            <li key={studio.slug}>
              <StudioCard studio={studio} result={results?.[studio.slug]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const DISMISS_KEY = "zennly:profile-prompt-dismissed:v1";

// useSyncExternalStore, not useEffect+setState, for the same reason src/lib/currency/store.ts
// reads localStorage this way: it's external (non-React) state, so this is a subscription, not a
// side effect to synchronize — and getServerSnapshot gives SSR a safe default with no hydration
// mismatch, where a useEffect would flash the prompt open for a frame before reading storage.
function subscribeDismissed() {
  return () => {};
}
function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A dismissible nudge toward finishing the profile — never a gate. Nothing here blocks anything;
 * it just disappears once dismissed (localStorage, this device) or once the profile is complete.
 * See src/lib/account/completeness.ts's header comment for why this must stay this way.
 */
function CompletenessPrompt() {
  const { user } = useAuth();
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => false);
  const [dismissedNow, setDismissedNow] = useState(false);

  if (!user) return null;
  const { missing, percent } = profileCompleteness(user);
  if (missing.length === 0 || dismissed || dismissedNow) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable (private browsing, quota) — still hide it for this render via
      // dismissedNow below; it just won't stay hidden across a reload.
    }
    setDismissedNow(true);
  };

  return (
    <div className="mt-6 flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-muted/60 px-4 py-3 text-sm">
      <p className="text-foreground">
        Your profile is {percent}% complete. Finishing it fills in bookings automatically — no typing your details every time.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  );
}

// Same visual language as login-dialog.tsx's phone field — one input pattern for phone entry
// everywhere in the app, not a second one invented here.
const FIELD =
  "h-11 rounded-[12px] border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

function ProfileEditCard() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dial, setDial] = useState(DEFAULT_COUNTRY.code);
  const [national, setNational] = useState("");
  const [gender, setGender] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot at the moment editing starts, so save() can send only what actually changed — every
  // field the form pre-fills is sent back untouched otherwise, and PATCH's "absent means leave
  // alone, null means clear" contract means an untouched-but-resent field with a subtly wrong
  // pre-fill (e.g. a phone that didn't round-trip through the dial-code split below) would
  // silently clear something the customer never meant to touch.
  const [original, setOriginal] = useState({ firstName: "", lastName: "", national: "", dial: DEFAULT_COUNTRY.code, gender: "" });

  const country = COUNTRIES.find((c) => c.code === dial) ?? DEFAULT_COUNTRY;

  const startEditing = () => {
    if (!user) return;
    const snapFirst = user.firstName ?? "";
    const snapLast = user.lastName ?? "";
    const snapDial = user.country ?? DEFAULT_COUNTRY.code;
    // The stored phone is E.164 (e.g. +9779812345678); split off the dial code so the national
    // part round-trips into the input the same way login-dialog.tsx's phone field works.
    const dialStr = (COUNTRIES.find((c) => c.code === snapDial) ?? DEFAULT_COUNTRY).dial;
    const snapNational = user.phone?.startsWith(dialStr) ? user.phone.slice(dialStr.length) : "";
    const snapGender = user.gender ?? "";

    setFirstName(snapFirst);
    setLastName(snapLast);
    setDial(snapDial);
    setNational(snapNational);
    setGender(snapGender);
    setOriginal({ firstName: snapFirst, lastName: snapLast, national: snapNational, dial: snapDial, gender: snapGender });
    setError(null);
    setEditing(true);
  };

  if (!user) return null;

  if (!editing) {
    return (
      <div className="mt-6 flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-sm">
        <div className="min-w-0 text-muted-foreground">
          {[user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName, user.phone, user.gender]
            .filter(Boolean)
            .join(" · ") || "Add your name, phone, and gender."}
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:border-foreground/40"
        >
          Edit profile
        </button>
      </div>
    );
  }

  const save = async () => {
    setError(null);

    // Client-side validation mirrors the server's (same functions, same rules) so a bad value
    // never round-trips to the API only to bounce — but the server re-validates independently and
    // is the actual authority; this is purely for faster feedback.
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (trimmedFirst && !normalizeName(trimmedFirst)) return setError("Enter a valid first name.");
    if (trimmedLast && !normalizeName(trimmedLast)) return setError("Enter a valid last name.");
    if (national.trim() && !normalizePhone(country.dial, national)) {
      return setError(country.dial === "+977" ? "Enter a valid Nepal mobile number." : "Enter a valid phone number.");
    }

    // Only fields that actually changed go in the request — see the comment on `original` above
    // for why resending every pre-filled value, even unchanged ones, would be the riskier choice.
    const trimmedNational = national.trim();
    const body: Record<string, string | null | undefined> = {};
    if (trimmedFirst !== original.firstName) body.firstName = trimmedFirst || null;
    if (trimmedLast !== original.lastName) body.lastName = trimmedLast || null;
    if (gender !== original.gender) body.gender = gender || null;
    if (trimmedNational !== original.national || dial !== original.dial) {
      body.phone = trimmedNational || null;
      if (trimmedNational) {
        body.dialCode = country.dial;
        body.country = country.code;
      }
    }

    if (Object.keys(body).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => ({ ok: r.ok }))
      .catch(() => ({ ok: false }));
    setSaving(false);

    if (!res.ok) {
      setError("Couldn't save — try again.");
      return;
    }
    // Re-reads /api/auth/me so `user` everywhere (nav, this page) reflects the edit immediately —
    // no sign-out, no page reload, the whole point of fixing the toAuthUser read path in M2.
    await auth.refresh();
    toast.success("Profile updated");
    setEditing(false);
  };

  return (
    <div className="mt-6 rounded-[var(--radius-md)] border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          First name
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={80}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Last name
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={80}
            className={FIELD}
          />
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1.5 text-sm">
        Phone
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
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={32}
            value={national}
            onChange={(e) => setNational(e.target.value)}
            placeholder={country.dial === "+977" ? "98XXXXXXXX" : "Phone number"}
            className={`${FIELD} min-w-0 flex-1`}
          />
        </div>
      </label>

      <fieldset className="mt-3">
        <legend className="text-sm">Gender</legend>
        <div className="mt-1.5 flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              aria-pressed={gender === g.value}
              onClick={() => setGender(gender === g.value ? "" : g.value)}
              className={`rounded-[var(--radius-full)] border px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                gender === g.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-foreground/40"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors duration-150 hover:border-foreground/40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StudioCard({ studio, result }: { studio: ConnectedStudio; result: LookupResult | undefined }) {
  const membership = result?.found && result.membership ? membershipView(result.membership) : null;
  const bookings = result?.found ? [...result.bookings, ...result.packages] : [];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
      <Link href={`/providers/${studio.slug}`} className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-muted">
          {studio.image && <Image src={studio.image} alt="" fill sizes="48px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground hover:underline">{studio.name}</p>
          <p className="text-sm text-muted-foreground">{studio.city}</p>
        </div>
      </Link>

      {!result ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading your visits…</p>
      ) : (
        <>
          {membership && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Membership</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{membership.tier}</p>
              {(membership.detail || membership.status) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[membership.detail, membership.status].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          )}

          {bookings.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {bookings.map((b, i) => {
                const line = bookingLine(b);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{line.title}</p>
                      <p className="text-muted-foreground">{line.detail}</p>
                    </div>
                    {line.status && (
                      <span className="shrink-0 rounded-[var(--radius-full)] bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {line.status}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!membership && bookings.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No visits here yet.</p>
          )}
        </>
      )}
    </div>
  );
}
