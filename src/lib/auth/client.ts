import { normalizeCode, normalizeEmail, normalizePhone } from "./normalize";
import type { Auth, AuthAdapter, AuthResult } from "./types";

const invalid = <T = never>(message: string): AuthResult<T> => ({
  ok: false,
  error: { code: "invalid_input", message },
});

/**
 * Wraps any adapter so validation and normalization happen once, here, and no adapter (fake or
 * real) ever sees raw input. Components call this wrapper, never an adapter directly.
 */
export function createAuth(adapter: AuthAdapter): Auth {
  return {
    name: adapter.name,
    demoHint: adapter.demoHint,
    supportsPhone: adapter.supportsPhone ?? true,
    emailMethod: adapter.emailMethod ?? "code",
    refresh: async () => adapter.refresh?.(),

    async signInWithPhone(dialCode, national) {
      const phone = normalizePhone(dialCode, national);
      if (!phone) return invalid("Enter a valid phone number.");
      return adapter.signInWithPhone(phone);
    },

    async signInWithEmail(email) {
      const normalized = normalizeEmail(email);
      if (!normalized) return invalid("Enter a valid email address.");
      return adapter.signInWithEmail(normalized);
    },

    async verifyCode(target, rawCode) {
      const code = normalizeCode(rawCode);
      if (!code) return invalid("Enter the 6-digit code.");
      // Re-normalize the target: it round-trips through component state.
      const value = target.kind === "email" ? normalizeEmail(target.value) : target.value;
      if (!value || (target.kind === "phone" && !/^\+[1-9]\d{6,14}$/.test(value))) {
        return invalid("Start again to get a new code.");
      }
      return adapter.verifyCode({ kind: target.kind, value }, code);
    },

    signInWithGoogle: () => adapter.signInWithGoogle(),
    signOut: () => adapter.signOut(),
    getUser: () => adapter.getUser(),
    onChange: (cb) => adapter.onChange(cb),
  };
}
