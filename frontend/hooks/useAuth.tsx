"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { api, ApiError, isUnreachable } from "@/lib/api";
import { parseTxError } from "@/lib/errors";
import { sameAddr } from "@/lib/format";
import { clearSession, readSession, SESSION_EXPIRED_EVENT, writeSession } from "@/lib/session";
import { readAccounts, signMessage } from "@/lib/wallet";
import type { Role, User } from "@/lib/types";

export type AuthStatus = "anonymous" | "signing" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  /** True until the stored session has been validated with /auth/me (avoids a redirect flash). */
  ready: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
  /** Replace the user after a backend response that returns an updated user (e.g. claim → ORGANIZER). */
  setUser: (u: User) => void;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  /** Home page for the user's role. */
  home: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function roleHome(role: Role | null | undefined): string {
  return role === "ADMIN" ? "/admin" : role === "ORGANIZER" ? "/organizer" : "/dashboard";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [status, setStatus] = useState<AuthStatus>("anonymous");
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const signing = useRef(false);

  const drop = useCallback(() => {
    clearSession();
    setUserState(null);
    setToken(null);
    setStatus("anonymous");
  }, []);

  // Mount: validate the stored session with /auth/me. Roles are only ever taken from the backend.
  useEffect(() => {
    const s = readSession();
    if (!s) {
      setReady(true);
      return;
    }
    setToken(s.token);
    setUserState(s.user);
    setStatus("authenticated");
    api
      .authMe()
      .then((r) => {
        setUserState(r.user);
        writeSession({ token: s.token, user: r.user, expiresAt: r.session.expiresAt });
      })
      .catch((e) => {
        // Keep the session if only the backend is unreachable; drop it on any app-level rejection.
        if (!isUnreachable(e)) drop();
      })
      .finally(() => setReady(true));
  }, [drop]);

  // Wallet switched to a different address than the signed-in one → session no longer belongs to the active wallet.
  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (wallet.account && !sameAddr(wallet.account, user.walletAddress)) {
      drop();
      toast("Wallet changed — sign in again.");
    }
  }, [wallet.account, status, user, drop]);

  // 401 from any request clears the session in lib/api and fires this event.
  useEffect(() => {
    const onExpired = () => {
      setUserState(null);
      setToken(null);
      setStatus("anonymous");
      toast("Session expired — sign in again.");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const signIn = useCallback(async (): Promise<User | null> => {
    if (signing.current) return null;
    signing.current = true;
    setStatus("signing");
    try {
      let account = wallet.account;
      if (!account) {
        await wallet.connect();
        account = (await readAccounts())[0] ?? null;
      }
      if (!account) throw new Error("Connect your MST wallet first.");
      const { nonce, message } = await api.authNonce(account);
      const signature = await signMessage(message);
      const r = await api.authVerify(account, nonce, signature);
      writeSession({ token: r.token, user: r.user, expiresAt: r.expiresAt });
      setToken(r.token);
      setUserState(r.user);
      setStatus("authenticated");
      toast.success("Wallet verified.");
      return r.user;
    } catch (e) {
      setStatus("anonymous");
      const ui = parseTxError(e);
      if (e instanceof ApiError) {
        const msg =
          e.code === "SUSPENDED" ? "This wallet is suspended. Contact support." :
          e.code === "RATE_LIMITED" ? "Too many attempts — wait a minute and try again." :
          e.code === "NONCE_INVALID" ? "The sign-in challenge expired. Try again." :
          e.code === "BAD_SIGNATURE" ? "The signature didn't match this wallet." :
          isUnreachable(e) ? "Backend unreachable — sign-in needs the ChitChain API." : e.message;
        toast.error(msg);
      } else if (ui.neutral) toast(ui.message);
      else toast.error(e instanceof Error && e.message ? ui.message : "Backend unreachable — sign-in needs the ChitChain API.");
      return null;
    } finally {
      signing.current = false;
    }
  }, [wallet]);

  const signOut = useCallback(async () => {
    try {
      if (readSession()) await api.authLogout();
    } catch {
      /* revoked or unreachable — local clear is what matters */
    }
    drop();
    wallet.disconnect();
  }, [drop, wallet]);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    const s = readSession();
    if (s) writeSession({ ...s, user: u });
  }, []);

  const value = useMemo<AuthState>(() => {
    const role = status === "authenticated" ? user?.role ?? null : null;
    return {
      status,
      user: status === "authenticated" ? user : null,
      token: status === "authenticated" ? token : null,
      ready,
      signIn,
      signOut,
      setUser,
      hasRole: (...roles: Role[]) => !!role && roles.includes(role),
      isAdmin: role === "ADMIN",
      isOrganizer: role === "ORGANIZER" || role === "ADMIN",
      home: roleHome(role),
    };
  }, [status, user, token, ready, signIn, signOut, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
