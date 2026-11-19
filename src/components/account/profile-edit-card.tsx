"use client";

import { useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { useAuth } from "@/lib/auth/auth-provider";
import { COUNTRIES, DEFAULT_COUNTRY, normalizeName, normalizePhone } from "@/lib/auth/normalize";

// Same visual language as login-dialog.tsx's phone field — one input pattern for phone entry
// everywhere in the app, not a second one invented here.
const FIELD =
  "h-11 rounded-[12px] border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

/** `dob` is YYYY-MM-DD (date-only, see Profile.dob in schema.prisma) — format it without going
 * through a timezone-sensitive Date parse, so a UTC-negative viewer never sees the day before. */
function formatDob(dob: string): string {
  const [y, m, d] = dob.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/**
 * Fresha's read-list-then-Edit shape: labelled values (First name, Last name, Phone, Email, Date
 * of birth, Gender) with one Edit affordance, replacing the old always-open form. Email is listed
 * for context but never editable here — it's the Supabase login identity, not a profile field
 * (see the PATCH handler's header comment); it never appears in the edit form or the save diff.
 */
export function ProfileEditCard() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dial, setDial] = useState(DEFAULT_COUNTRY.code);
  const [national, setNational] = useState("");
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot at the moment editing starts, so save() can send only what actually changed — every
  // field the form pre-fills is sent back untouched otherwise, and PATCH's "absent means leave
  // alone, null means clear" contract means an untouched-but-resent field with a subtly wrong
  // pre-fill (e.g. a phone that didn't round-trip through the dial-code split below) would
  // silently clear something the customer never meant to touch.
  const [original, setOriginal] = useState({
    firstName: "",
    lastName: "",
    national: "",
    dial: DEFAULT_COUNTRY.code,
    gender: "",
    dob: "",
  });

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
    const snapDob = user.dob ?? "";

    // A SUGGESTION, not a stored value: Google sends only a combined `name` ("Anish Balami"), never
    // given_name/family_name (confirmed against the real account's raw identity data), so
    // ensureProfile correctly leaves firstName/lastName null — there's nothing to backfill. This
    // splits `name` on the FIRST space only (multi-word surnames — "Bahadur Singh Thapa" — split
    // wrong on every space) purely to prefill the form fields. Deliberately NOT written to
    // `original`: original stays the real empty snapshot, so if the customer saves the suggestion
    // unmodified, save()'s diff (trimmed !== original) still sees it as a change and sends it —
    // a suggestion that silently failed to save on an unmodified Save click would be worse than no
    // suggestion at all. It also never reaches the database unless the customer presses Save.
    let suggestedFirst = snapFirst;
    let suggestedLast = snapLast;
    if (!snapFirst && !snapLast && user.name) {
      const spaceIndex = user.name.indexOf(" ");
      if (spaceIndex > 0) {
        suggestedFirst = user.name.slice(0, spaceIndex);
        suggestedLast = user.name.slice(spaceIndex + 1);
      } else {
        suggestedFirst = user.name;
      }
    }

    setFirstName(suggestedFirst);
    setLastName(suggestedLast);
    setDial(snapDial);
    setNational(snapNational);
    setGender(snapGender);
    setDob(snapDob);
    setOriginal({ firstName: snapFirst, lastName: snapLast, national: snapNational, dial: snapDial, gender: snapGender, dob: snapDob });
    setError(null);
    setEditing(true);
  };

  if (!user) return null;

  if (!editing) {
    const ROWS: { label: string; value: string | undefined }[] = [
      { label: "First name", value: user.firstName },
      { label: "Last name", value: user.lastName },
      { label: "Phone", value: user.phone },
      { label: "Email", value: user.email },
      { label: "Date of birth", value: user.dob ? formatDob(user.dob) : undefined },
      { label: "Gender", value: GENDERS.find((g) => g.value === user.gender)?.label },
    ];

    return (
      <div className="mt-6 rounded-[var(--radius-md)] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-foreground">Your details</p>
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:border-foreground/40"
          >
            Edit
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {ROWS.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={row.value ? "text-foreground" : "text-muted-foreground"}>{row.value ?? "Not set"}</dd>
            </div>
          ))}
        </dl>
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
    // The phone/country pair is exactly where this bites: +1 maps to both US and CA (why
    // `country` has to be stored at all, separately from the E.164 phone string), so a phone
    // round-trip is precisely the kind of pre-fill that can come back subtly different from what
    // was actually stored. Diffing against the snapshot makes that class of bug unreachable
    // rather than merely unlikely, for a field the customer may not have touched this save.
    const trimmedNational = national.trim();
    const body: Record<string, string | null | undefined> = {};
    if (trimmedFirst !== original.firstName) body.firstName = trimmedFirst || null;
    if (trimmedLast !== original.lastName) body.lastName = trimmedLast || null;
    if (gender !== original.gender) body.gender = gender || null;
    if (dob !== original.dob) body.dob = dob || null;
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

      <label className="mt-3 flex flex-col gap-1.5 text-sm">
        Email
        <input value={user.email ?? ""} disabled className={`${FIELD} opacity-60`} />
      </label>

      <label className="mt-3 flex flex-col gap-1.5 text-sm sm:w-1/2">
        Date of birth
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={FIELD}
        />
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
