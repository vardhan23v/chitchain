import type { Session, User } from "@/lib/types";

export const SESSION_KEY = "chitchain:session";
export const SESSION_EXPIRED_EVENT = "chitchain:session-expired";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Reads the stored session; null when missing, malformed or expired. Roles are NOT trusted from here — useAuth re-validates with /auth/me. */
export function readSession(): Session | null {
  try {
    const raw = storage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    if (!s || typeof s.token !== "string" || !s.user || typeof s.user.walletAddress !== "string") return null;
    if (typeof s.expiresAt === "number" && s.expiresAt * (s.expiresAt < 1e12 ? 1000 : 1) < Date.now()) return null;
    return { token: s.token, user: s.user as User, expiresAt: Number(s.expiresAt ?? 0) };
  } catch {
    return null;
  }
}

export function writeSession(s: Session): void {
  try {
    storage()?.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota */
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function sessionToken(): string | null {
  return readSession()?.token ?? null;
}

export function emitSessionExpired(): void {
  try {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  } catch {
    /* SSR */
  }
}
