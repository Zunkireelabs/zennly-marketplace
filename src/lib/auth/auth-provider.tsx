"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/track";
import { LoginDialog } from "@/components/auth/login-dialog";
import { SavedSync } from "@/lib/saved/saved-sync";
import { auth, type AuthUser } from "./index";

export type LoginReason = "login" | "save" | "booking";

type AuthContext = {
  user: AuthUser | null;
  /** False on the server and during hydration, so signed-in UI never flashes the signed-out state. */
  ready: boolean;
  loginOpen: boolean;
  loginReason: LoginReason;
  openLogin: (reason?: LoginReason) => void;
  closeLogin: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthContext | null>(null);

const noopSubscribe = () => () => {};

export function useAuth(): AuthContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(
    auth.onChange,
    auth.getUser,
    () => null
  );
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<LoginReason>("login");

  const openLogin = useCallback((reason: LoginReason = "login") => {
    setLoginReason(reason);
    setLoginOpen(true);
    track("login_started", { reason });
  }, []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const signOut = useCallback(() => auth.signOut(), []);

  const value = useMemo<AuthContext>(
    () => ({ user, ready, loginOpen, loginReason, openLogin, closeLogin, signOut }),
    [user, ready, loginOpen, loginReason, openLogin, closeLogin, signOut]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <SavedSync user={user} />
      <LoginDialog />
    </Ctx.Provider>
  );
}
