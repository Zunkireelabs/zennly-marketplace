/**
 * Auth contract. Screens only ever talk to `auth` from `./index.ts`; which adapter sits behind it
 * is decided in that one file (fake today, Supabase in Phase 2).
 *
 * Adapters receive input that has already been validated and normalized by `createAuth`
 * (client.ts): phone is E.164, email is trimmed and lowercase, codes are exactly six digits.
 */

export type AuthUser = {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  /** From the profiles row — the auth adapter's own `AuthResult<AuthUser>` returns (sign-in,
   * verifyCode) never populate these; only the server-read path (toAuthUser with a profile) does. */
  firstName?: string;
  lastName?: string;
  /** From the profiles row — ensureProfile's Google backfill today, a customer upload later.
   * Absent for most users (email-OTP signups get none); render an initial-letter fallback. */
  avatar?: string;
  gender?: string;
  /** ISO-2, behind the phone's dial code (see Profile.country in schema.prisma). */
  country?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
};

export type AuthErrorCode =
  | "invalid_input"
  | "cooldown"
  | "no_challenge"
  | "invalid_code"
  | "expired"
  | "locked"
  | "unavailable";

export type AuthError = {
  code: AuthErrorCode;
  message: string;
  /** For `cooldown` and `locked`: how long until the next try. */
  retryAfterMs?: number;
  /** For `invalid_code`. */
  attemptsLeft?: number;
};

export type AuthResult<T = void> = { ok: true; data: T } | { ok: false; error: AuthError };

export type CodeTarget = { kind: "phone" | "email"; value: string };

export type Unsubscribe = () => void;

export interface AuthAdapter {
  /** Short label for logs and the demo banner, e.g. "fake". */
  readonly name: string;
  /** Set only by demo adapters. Shown in the login UI; real adapters leave it undefined. */
  readonly demoHint?: string;
  /**
   * False hides the Phone tab entirely (email and Google only). The Supabase adapter currently
   * leaves this true but disables the tab in the UI instead (login-dialog.tsx) — phone is a
   * known-coming method, worth showing as planned, not just absent.
   */
  readonly supportsPhone?: boolean;
  /** "link": email sends a sign-in link (no code to type). Default "code". */
  readonly emailMethod?: "code" | "link";
  /** Re-reads the session, e.g. after the person clicked the emailed link in another tab. */
  refresh?(): Promise<void>;

  signInWithPhone(phoneE164: string): Promise<AuthResult<CodeTarget>>;
  signInWithEmail(email: string): Promise<AuthResult<CodeTarget>>;
  verifyCode(target: CodeTarget, code: string): Promise<AuthResult<AuthUser>>;
  signInWithGoogle(): Promise<AuthResult<AuthUser>>;
  signOut(): Promise<void>;
  /**
   * The current user from the adapter's cached session (synchronous so it can back
   * `useSyncExternalStore`). Adapters that load the session asynchronously call their `onChange`
   * listeners once it arrives.
   */
  getUser(): AuthUser | null;
  onChange(listener: () => void): Unsubscribe;
}

/** What screens get: the adapter contract, but taking raw user input. */
export interface Auth {
  readonly name: string;
  readonly demoHint?: string;
  readonly supportsPhone: boolean;
  readonly emailMethod: "code" | "link";
  refresh(): Promise<void>;
  /** `dialCode` like "+977"; `national` is whatever the person typed. */
  signInWithPhone(dialCode: string, national: string): Promise<AuthResult<CodeTarget>>;
  signInWithEmail(email: string): Promise<AuthResult<CodeTarget>>;
  verifyCode(target: CodeTarget, code: string): Promise<AuthResult<AuthUser>>;
  signInWithGoogle(): Promise<AuthResult<AuthUser>>;
  signOut(): Promise<void>;
  getUser(): AuthUser | null;
  onChange(listener: () => void): Unsubscribe;
}
