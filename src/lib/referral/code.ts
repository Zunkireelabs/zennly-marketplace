/**
 * The shape of an invite code, shared by the server rules and the browser. No server-only imports
 * here: the browser bundle uses this to tidy a code before sending it.
 */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export const CODE_LENGTH = 8;
const CODE_FORMAT = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_FORMAT.test(code) ? code : null;
}
