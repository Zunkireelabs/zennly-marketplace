/**
 * Input normalization and validation for identifiers. Lives in the auth layer so components never
 * format or trust raw input. Returns null when the input is not acceptable.
 */

export type Country = { code: string; name: string; dial: string };

/** Nepal first (launch market), then the places its diaspora and global users are most likely to be. */
export const COUNTRIES: Country[] = [
  { code: "NP", name: "Nepal", dial: "+977" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "DE", name: "Germany", dial: "+49" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

const E164 = /^\+[1-9]\d{6,14}$/;
// Nepal mobile numbers: 10 digits starting 96, 97 or 98.
const NEPAL_MOBILE = /^9[6-8]\d{8}$/;
const DIAL_CODES = new Set(COUNTRIES.map((c) => c.dial));

export function normalizePhone(dialCode: string, national: string): string | null {
  if (!DIAL_CODES.has(dialCode)) return null;
  if (national.length > 32) return null;
  // Only digits, spaces and common separators are allowed; anything else is rejected, not stripped.
  if (!/^[\d\s().-]*$/.test(national)) return null;
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  if (dialCode === "+977" && !NEPAL_MOBILE.test(digits)) return null;
  const e164 = `${dialCode}${digits}`;
  return E164.test(e164) ? e164 : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(input: string): string | null {
  if (input.length > 254) return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return null;
  // Reject control characters and a second "@" (header/log injection, ambiguous parsing).
  if (/[\u0000-\u001f\u007f]/.test(email) || email.split("@").length !== 2) return null;
  return email;
}

export function normalizeCode(input: string): string | null {
  const code = input.replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

/** Names typed into forms: trimmed, control characters removed, 2 to 80 characters. */
export function normalizeName(input: string): string | null {
  const name = input.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

/** Masks an identifier for display, e.g. "+977 98••••••12" or "a•••@gmail.com". */
export function maskTarget(kind: "phone" | "email", value: string): string {
  if (kind === "phone") return `${value.slice(0, 4)}••••${value.slice(-2)}`;
  const [local, domain] = value.split("@");
  return `${local.slice(0, 1)}•••@${domain}`;
}
