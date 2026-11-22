/**
 * "Work email" validation for the marketing site's demo-request forms (hero form, trial modal).
 * Owner's decision: warn, never block. A free-provider address (gmail, yahoo, …) gets a gentle
 * nudge but still gets the demo — the demo login handed out IS demo@gmail.com, so hard-blocking
 * gmail would contradict the product. Only a malformed address is rejected outright.
 *
 * Mirrored (not imported — see below) at marketing/src/_data/workEmail.js for the client-side
 * nudge in _trial-modal.njk/index.njk. The marketing site is a separate Eleventy/vanilla-JS
 * workspace with no bundler for client scripts, so a literal cross-workspace ES import isn't
 * possible; the Eleventy data file is interpolated into the inline <script> the same way
 * edgex.key/edgex.base already are. Keep the two lists in sync by hand — this file is the
 * canonical source; the mirror's own comment points back here.
 */

// Same regex otp-service's server.js used (validEmail): simple and permissive on purpose — this
// is a UX nudge and a basic sanity check, not full RFC 5322 validation.
const EMAIL_FORMAT = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
];

export function isValidEmailFormat(email: string): boolean {
  return typeof email === "string" && email.length > 0 && email.length <= 254 && EMAIL_FORMAT.test(email);
}

export function isFreeEmailDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  return FREE_EMAIL_DOMAINS.includes(email.slice(at + 1).toLowerCase());
}
