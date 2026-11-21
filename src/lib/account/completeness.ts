import type { AuthUser } from "@/lib/auth/types";

/**
 * Whether a profile has what it takes for a one-tap booking: verified email, firstName, phone,
 * gender. Deliberately NOT lastName (a single-word Nepali given name is common and the greeting/
 * display name already work without it) and NOT country (an implementation detail of the phone
 * field, not something a customer thinks of as "part of my profile").
 *
 * THIS MUST NEVER GATE ANYTHING. It exists to power a dismissible "finish your profile" prompt on
 * /account, nothing else. In particular: `booking-drawer.tsx` and the `public_create_booking` path
 * must never import this module or branch on its output — a customer with an empty profile must
 * be able to book exactly as freely as one with a complete one. If you're adding a call site
 * anywhere under src/components/provider or src/lib/booking, stop; that is the one thing this file
 * is not for.
 */

export type ProfileCompletenessField = "email" | "firstName" | "phone" | "gender";

const FIELDS: ProfileCompletenessField[] = ["email", "firstName", "phone", "gender"];

export type ProfileCompleteness = {
  have: ProfileCompletenessField[];
  missing: ProfileCompletenessField[];
  percent: number;
};

export function profileCompleteness(user: AuthUser): ProfileCompleteness {
  const present: Record<ProfileCompletenessField, boolean> = {
    email: Boolean(user.email) && user.emailVerified,
    firstName: Boolean(user.firstName),
    phone: Boolean(user.phone),
    gender: Boolean(user.gender),
  };

  const have = FIELDS.filter((f) => present[f]);
  const missing = FIELDS.filter((f) => !present[f]);

  return { have, missing, percent: Math.round((have.length / FIELDS.length) * 100) };
}
