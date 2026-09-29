import { API_URL } from "@/lib/chain";
import { clearSession, emitSessionExpired, sessionToken } from "@/lib/session";
import type {
  AdminOverview, AdminUser, AgentEvent, AgentLog, AuctionBid, AuctionSnapshot, AuditRow, BidAgent, CircleAnalytics, CircleRoom, CircleSummary, DefaultRecord, DemoState, FeedEvent, Invite, Level, LoopStatus,
  Mandate, MeOverview, MyCircle, OrganizerCircle, RiskResult, Role, RoundHistoryRow, Stats, SupportTicket, User, UserStatus,
} from "@/lib/types";
import type { AdminTreasury, Health, Profile, UsernameCheck } from "@/lib/types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public body?: unknown) {
    super(message);
  }
}

/** 401 codes that mean the stored session is dead (API.md v3). */
const AUTH_DEAD = new Set(["NO_AUTH", "BAD_TOKEN", "SESSION_REVOKED"]);

async function request<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const token = sessionToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const text = await res.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    if (!res.ok) {
      if (res.status === 401 && token && AUTH_DEAD.has(String(body?.code ?? "NO_AUTH"))) {
        clearSession();
        emitSessionExpired();
      }
      throw new ApiError(body?.error ?? body?.message ?? `HTTP ${res.status}`, res.status, body?.code, body);
    }
    return body as T;
  } finally {
    clearTimeout(t);
  }
}

const post = <T>(path: string, body?: unknown, timeoutMs?: number) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, timeoutMs);
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

function qs(p: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export interface ClaimBody { name: string; description?: string; txHash?: string }
export interface AdminUserPatch { role?: Role; status?: UserStatus; displayName?: string }

export interface MandateBody {
  circleId: number;
  member: string;
  goal: string;
  /** MST decimal string */
  desiredPayout?: string;
  maxDiscountPct?: number;
  urgency?: Level;
  riskTolerance?: Level;
}

/** `POST /ai/bidding/start` (API.md v4). MST amounts are decimal strings; the backend converts to wei. */
export interface AiStartBody {
  circleId: number;
  member: string;
  goal: string;
  desiredPayout?: string;
  maxDiscount: string;
  maxDiscountPct: number;
  urgency: Level;
  riskTolerance: Level;
  durationSec?: number | null;
  autonomous: boolean;
  demoMode?: boolean;
}

export interface DemoNewCircleBody {
  contributionDuration?: number;
  biddingDuration?: number;
  /** MST decimal string */
  contribution?: string;
  holdbackBps?: number;
  maxDiscountBps?: number;
}

export const api = {
  health: () => request<Health>("/health", undefined, 4000),
  stats: () => request<Stats>("/stats"),
  circles: () => request<{ circles: CircleSummary[] }>("/circles"),
  circle: (id: number) => request<CircleRoom>(`/circles/${id}`),
  rounds: (id: number) => request<{ rounds: RoundHistoryRow[] }>(`/circles/${id}/rounds`),
  defaults: (id: number) => request<{ defaults: DefaultRecord[] }>(`/circles/${id}/defaults`),
  activity: (addr: string, limit = 100) => request<{ events: FeedEvent[] }>(`/members/${addr}/activity?limit=${limit}`),
  myCircles: (addr: string) => request<{ circles: MyCircle[] }>(`/members/${addr}/circles`),
  feed: (p: { circleId?: number; since?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (p.circleId !== undefined) q.set("circleId", String(p.circleId));
    if (p.since !== undefined) q.set("since", String(p.since));
    if (p.limit !== undefined) q.set("limit", String(p.limit));
    return request<{ events: FeedEvent[] }>(`/feed?${q.toString()}`);
  },
  risk: (addr: string) => request<RiskResult>(`/members/${addr}/risk`),
  assess: (addr: string) => post<RiskResult & { txHash: string }>(`/members/${addr}/assess`, undefined, 60_000),
  mandate: (body: MandateBody) => post<{ mandate: Mandate; decision: AgentLog | null }>("/agent/mandate", body, 60_000),
  deleteMandate: (circleId: number, member: string) =>
    request<{ ok: boolean }>(`/agent/mandate?circleId=${circleId}&member=${member}`, { method: "DELETE" }),
  agentLogs: (circleId: number, limit = 20) => request<{ logs: AgentLog[] }>(`/agent/logs?circleId=${circleId}&limit=${limit}`),
  demoState: () => request<DemoState>("/demo/state"),
  /** Public: is this wallet on the circle's invite list? Informational only; 404 on older backends. */
  inviteCheck: (circleId: number, address: string) => request<{ invited: boolean }>(`/circles/${circleId}/invites/check?address=${encodeURIComponent(address)}`, undefined, 5000),
  demoFund: () => post<{ txHashes: string[] }>("/demo/fund", undefined, 120_000),
  demoAssessAll: () => post<{ results: (RiskResult & { txHash: string })[] }>("/demo/assess-all", undefined, 120_000),
  demoSkip: (address: string, skip: boolean) => post<{ ok: boolean }>("/demo/skip", { address, skip }),
  demoNewCircle: (body?: DemoNewCircleBody) =>
    post<{ circleId: number; txHash: string }>("/demo/new-circle", body ?? { contributionDuration: 30, biddingDuration: 30 }, 180_000),
  demoWithdraw: (address: string, circleId: number) => post<{ txHash: string }>("/demo/withdraw", { address, circleId }, 60_000),
  /** Runs whichever permissionless step is due (close contributions, or settle after the decision / auction window). */
  settle: (id: number) => post<{ txHash: string; step: "closeContributions" | "settleRound" }>(`/circles/${id}/settle`, undefined, 60_000),
  /** Admin: the custodial demo recipient accepts or declines the full pot from its own key. */
  demoDecide: (circleId: number, decision: "accept" | "decline") => post<{ txHash: string }>("/demo/decide", { circleId, decision }, 60_000),
  checkUsername: (name: string, wallet?: string | null) =>
    request<UsernameCheck>(`/usernames/check?name=${encodeURIComponent(name)}${wallet ? `&wallet=${wallet}` : ""}`),
  setUsername: (username: string) => put<{ user: User }>("/me/username", { username }),
  usernames: (addresses: string[]) => request<{ names: Record<string, string> }>(`/usernames?addresses=${addresses.join(",")}`),
  profile: (addr: string) => request<Profile>(`/members/${addr}/profile`),

  /* ── v3 auth ── */
  authNonce: (address: string) => post<{ nonce: string; message: string; expiresAt: number }>("/auth/nonce", { address }),
  authVerify: (address: string, nonce: string, signature: string) =>
    post<{ token: string; expiresAt: number; user: User }>("/auth/verify", { address, nonce, signature }),
  /** Platform-admin password fallback (401 BAD_CREDENTIALS, 404 NOT_ENABLED, 429 RATE_LIMITED). */
  adminLogin: (username: string, password: string) =>
    post<{ token: string; expiresAt: number; user: User }>("/auth/admin-login", { username, password }),
  authMe: () => request<{ user: User; session: { id: string; expiresAt: number } }>("/auth/me", undefined, 6000),
  authLogout: () => post<{ ok: boolean }>("/auth/logout"),

  /* ── v3 me ── */
  me: () => request<MeOverview>("/me"),
  meCircles: () => request<{ circles: MyCircle[] }>("/me/circles"),
  meInvites: () => request<{ invites: Invite[] }>("/me/invites"),
  updateMe: (body: { displayName: string }) => patch<{ user: User }>("/me", body),
  claimCircle: (id: number, body: ClaimBody) => post<{ circle: CircleSummary; user: User }>(`/circles/${id}/claim`, body, 20_000),

  /* ── v3 organizer ── */
  organizerCircles: () => request<{ circles: OrganizerCircle[] }>("/organizer/circles"),
  organizerMeta: (id: number, body: { name: string; description?: string }) => post<{ circle: CircleSummary }>(`/organizer/circles/${id}/meta`, body),
  organizerInvite: (id: number, addresses: string[]) => post<{ invites: Invite[] }>(`/organizer/circles/${id}/invites`, { addresses }),
  organizerUninvite: (id: number, addr: string) => del<{ ok: boolean }>(`/organizer/circles/${id}/invites/${addr}`),
  organizerAnalytics: (id: number) => request<CircleAnalytics>(`/organizer/circles/${id}/analytics`),

  /* ── v3 support ── */
  supportCreate: (body: { subject: string; message: string }) => post<{ ticket: SupportTicket }>("/support", body),
  supportMine: () => request<{ tickets: SupportTicket[] }>("/support/mine"),

  /* ── v3 admin ── */
  adminOverview: () => request<AdminOverview>("/admin/overview"),
  adminUsers: (p: { role?: string; status?: string; q?: string; limit?: number } = {}) => request<{ users: AdminUser[] }>(`/admin/users${qs(p)}`),
  adminUpdateUser: (addr: string, body: AdminUserPatch) => patch<{ user: User }>(`/admin/users/${addr}`, body),
  adminAudit: (p: { limit?: number; actor?: string; action?: string; since?: number } = {}) => request<{ rows: AuditRow[] }>(`/admin/audit${qs(p)}`),
  adminSupport: (status?: string) => request<{ tickets: SupportTicket[] }>(`/admin/support${qs({ status })}`),
  adminUpdateTicket: (id: number, body: { status?: "OPEN" | "CLOSED"; adminNote?: string }) => patch<{ ticket: SupportTicket }>(`/admin/support/${id}`, body),
  adminConfig: () => request<Record<string, unknown>>("/admin/config"),
  /** Contract fees claimable by the treasury (404 on older backends). */
  adminTreasury: () => request<AdminTreasury>("/admin/treasury"),
  adminTreasuryWithdraw: () => post<{ txHash: string }>("/admin/treasury/withdraw", undefined, 60_000),
  /* ── v4 autonomous AI bidding ── */
  aiStart: (body: AiStartBody) => post<{ agent: BidAgent }>("/ai/bidding/start", body, 20_000),
  aiPause: (agentId: string) => post<{ agent: BidAgent }>("/ai/bidding/pause", { agentId }),
  aiResume: (agentId: string, autonomous?: boolean) => post<{ agent: BidAgent }>("/ai/bidding/resume", autonomous === undefined ? { agentId } : { agentId, autonomous }),
  aiStop: (agentId: string) => post<{ agent: BidAgent }>("/ai/bidding/stop", { agentId }),
  aiStatus: (agentId: string) => request<{ agent: BidAgent; auction: AuctionSnapshot | null }>(`/ai/bidding/status/${agentId}`),
  aiActivity: (agentId: string, since?: number, limit = 100) => request<{ events: AgentEvent[] }>(`/ai/bidding/activity/${agentId}${qs({ since, limit })}`),
  aiMine: (circleId: number) => request<{ agents: BidAgent[] }>(`/ai/bidding/mine${qs({ circleId })}`),
  aiEvaluate: (agentId: string) => post<{ decision: unknown }>("/ai/bidding/evaluate", { agentId }, 30_000),
  auction: (circleId: number) => request<AuctionSnapshot>(`/auction/${circleId}`),
  auctionBids: (circleId: number, limit = 50) => request<{ bids: AuctionBid[] }>(`/auction/${circleId}/bids${qs({ limit })}`),
  healthLoops: () => request<{ loops?: LoopStatus[] }>("/health", undefined, 4000),
};

/** True when the backend itself is down (network error, timeout, bad gateway) rather than answering with an app error. */
export function isUnreachable(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 502 || e.status === 503 || e.status === 504;
  return true; // network error / abort / JSON parse
}
