import type { AuthAdapter, AuthResult } from "./types";

/**
 * Fails closed. Used whenever no real adapter is configured (production today): nobody can sign
 * in, `getUser()` is always null, and the login screen says so.
 */
export function createUnavailableAdapter(): AuthAdapter {
  const fail = async <T = never>(): Promise<AuthResult<T>> => ({
    ok: false,
    error: { code: "unavailable", message: "Sign in isn't available yet." },
  });

  return {
    name: "unavailable",
    signInWithPhone: () => fail(),
    signInWithEmail: () => fail(),
    verifyCode: () => fail(),
    signInWithGoogle: () => fail(),
    signOut: async () => {},
    getUser: () => null,
    onChange: () => () => {},
  };
}
