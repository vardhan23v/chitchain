/** Shapes mirroring API.md (v2). Wei values are decimal strings (API) or bigint (chain); we normalise to string. */
export type Tier = 0 | 1 | 2 | 3; // Unassessed, Low, Medium, High
export type Status = 0 | 1 | 2 | 3; // Open, Active, Completed, Cancelled

export type RoundPhase = "contribution" | "bidding" | "settling";
export type ContributionStatus = "PAID" | "PENDING" | "COVERED_BY_COLLATERAL" | "PARTIALLY_COVERED" | "DEFAULTED";
export type DefaultStatus = "COVERED_BY_COLLATERAL" | "PARTIALLY_COVERED";

/** = contract CircleView (v2) + id + isDemo */
export interface CircleSummary {
  id: number;
  creator: string;
  contribution: string;
  baseCollateral: string;
  maxMembers: number;
  contributionDuration: number;
  biddingDuration: number;
  joinDeadline: number;
  feeBps: number;
  holdbackBps: number;
  maxDiscountBps: number;
  lowBps: number;
  mediumBps: number;
  highBps: number;
  status: Status;
  round: number;
  contributionDeadline: number;
  /** = bidding deadline (settle-able time). */
  roundDeadline: number;
  reserve: string;
  memberCount: number;
  isDemo: boolean;
  /** v3: organizer-given name (null until claimed / named). */
  name: string | null;
  /** v3: wallet of the user who claimed the circle (lowercase) or null. */
  organizerWallet: string | null;
}

export interface RoundInfo {
  round: number;
  contributionDeadline: number;
  /** bidding deadline */
  deadline: number;
  expectedPot: string;
  collected: string;
  bestBidder: string;
  bestDiscount: string;
  maxDiscount: string;
  /** expectedPot − bestDiscount */
  lowestAcceptedPayout: string;
  phase: RoundPhase;
}

export interface DefaultInfo {
  round: number;
  required: string;
  fromCollateral: string;
  fromReserve: string;
  shortfall: string;
  remainingCollateral: string;
  status: DefaultStatus;
  potFullyFunded: boolean;
  txHash: string;
  ts: number;
}

export type DefaultRecord = DefaultInfo & { member: string; label: string | null };

export interface MemberInfo {
  address: string;
  label: string | null;
  custodial: boolean;
  joined: boolean;
  tier: Tier;
  hasWon: boolean;
  removed: boolean;
  collateral: string;
  collateralUsed: string;
  defaults: number;
  claimable: string;
  paidThisRound: boolean;
  bidThisRound: string;
  requiredCollateral: string;
  contributionStatus: ContributionStatus;
  lastDefault: DefaultInfo | null;
}

export interface RoundHistoryRow {
  round: number;
  winner: string | null;
  winnerLabel: string | null;
  pot: string;
  payout: string;
  discount: string;
  fee: string;
  holdback: string;
  dividendsTotal: string;
  dividendPerMember: string;
  settledAt: number;
  txHash: string | null;
}

export interface FeedEvent {
  id: number;
  circleId: number | null;
  round: number | null;
  name: string;
  args: Record<string, string | number | boolean>;
  txHash: string;
  logIndex: number;
  block: number;
  ts: number;
  agent: { reason: string; member: string } | null;
}

export interface RiskFactor { name: string; value: string; effect: string }

export interface RiskResult {
  address: string;
  /** 0 = safest, 100 = riskiest; LOW <=39, MEDIUM 40-69, HIGH >=70 */
  score: number;
  tier: Tier;
  onChainTier: Tier;
  factors: RiskFactor[];
  explanation: string;
  explanationSource: "llm" | "template";
  dataSource: "SYNTHETIC" | "ONCHAIN" | "MIXED";
  reputation: { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number };
  history: FeedEvent[];
}

export interface AgentLog {
  id: number;
  circleId: number;
  round: number;
  member: string;
  agentWallet: string;
  bidThisRound: boolean;
  discount: string;
  reason: string;
  source: "llm" | "fallback";
  txHash: string | null;
  error: string | null;
  ts: number;
}

export type Level = "low" | "medium" | "high";

export interface Mandate {
  circleId: number;
  member: string;
  goal: string;
  desiredPayout: string | null;
  maxDiscountPct: number | null;
  urgency: Level | null;
  riskTolerance: Level | null;
  active: boolean;
  createdAt: number;
}

export interface CircleRoom {
  circle: CircleSummary;
  round: RoundInfo;
  members: MemberInfo[];
  txCount: number;
  mandates: Mandate[];
  latestDefault: DefaultRecord | null;
}

export type MyCircle = CircleSummary & { me: MemberInfo };

export interface Stats { circlesLive: number; circlesTotal: number; mstcInContract: string; txCount: number }

export interface DemoWallet {
  label: string;
  address: string;
  balance: string;
  tier: Tier;
  skip: boolean;
  custodial: true;
}

export interface DemoState { wallets: DemoWallet[]; txCount: number; contract: string; circleId: number | null }

export type DataSource = "api" | "chain";

/* ───────── v3, wallet login, roles, audit, support ───────── */

export type Role = "MEMBER" | "ORGANIZER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface User {
  /** lowercase */
  walletAddress: string;
  role: Role;
  status: UserStatus;
  displayName: string | null;
  createdAt: number;
  lastLogin: number | null;
}

export interface Session { token: string; user: User; expiresAt: number }

/** Password-admin sessions (API.md v3 `/auth/admin-login`) have walletAddress `admin:<username>`, not an on-chain address. */
export const ADMIN_LOGIN_PREFIX = "admin:";
export const isPasswordAdmin = (u: { walletAddress: string } | null | undefined): boolean => !!u && u.walletAddress.startsWith(ADMIN_LOGIN_PREFIX);
export const isEvmAddress = (v: string | null | undefined): boolean => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);

export interface MeOverview {
  user: User;
  /** wei */
  balance: string;
  risk: RiskResult | null;
  totals: { contributions: string; payouts: string; dividends: string; defaults: number; circles: number };
  activeCircle: (Omit<CircleSummary, "round"> & { me: MemberInfo; round: RoundInfo }) | null;
}

export interface Invite { circleId: number; circle: CircleSummary | null; invitedBy: string; createdAt: number }

/** API.md: `round` here is the RoundInfo object; the round number lives at `round.round` (see `roundNo`). */
export interface OrganizerCircle extends Omit<CircleSummary, "round"> {
  members: MemberInfo[];
  round: RoundInfo;
  pendingContributions: number;
  defaults: number;
  collateralTotal: string;
  lowestAcceptedPayout: string;
}

export interface CircleAnalytics {
  circle: CircleSummary;
  round: RoundInfo;
  members: MemberInfo[];
  rounds: RoundHistoryRow[];
  defaults: DefaultRecord[];
  /** 0..1 this round */
  contributionRate: number;
  agentDecisions: number;
  recentEvents: FeedEvent[];
}

export interface AuditRow {
  id: number;
  ts: number;
  actorWallet: string | null;
  /** MEMBER|ORGANIZER|ADMIN|SYSTEM|KEEPER|AGENT|AUTOPILOT|ORACLE */
  role: string;
  action: string;
  target: string | null;
  result: string;
  txHash: string | null;
  meta: Record<string, unknown> | null;
}

export interface SupportTicket {
  id: number;
  userWallet: string;
  subject: string;
  message: string;
  status: "OPEN" | "CLOSED";
  adminNote: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface LoopStatus {
  name: string;
  everyMs: number;
  ticks: number;
  errors: number;
  lastTickAt: number | null;
  lastOkAt: number | null;
  lastError: string | null;
  busy: boolean;
}

export interface AdminOverview {
  users: { total: number; active: number; byRole: Record<Role, number>; suspended: number };
  circles: { total: number; open: number; active: number; completed: number; cancelled: number; demo: number };
  /** wei */
  mst: { locked: string; pots: string; collateral: string; reserve: string };
  defaults: number;
  tx: { total: number; sent: number; mined: number; failed: number; lastFailure: string | null };
  tickets: { open: number };
  audit: { last24h: number };
  chain: { chainId: number; latestBlock: number; lastIndexedBlock: number | null; lag: number; connected: boolean };
  contract: { address: string | null; status: "ACTIVE" | "NOT_CONFIGURED"; explorer: string };
  loops: LoopStatus[];
  keeper: { address: string | null; balance: string; status: "ONLINE" | "STALE" | "OFFLINE" };
  wallets: { deployer: { address: string; balance: string } | null; oracle: { address: string; balance: string } | null };
}

export type AdminUser = User & { circles: number };

/** Round number from either shape (`round: number` or `round: RoundInfo`). */
export function roundNo(c: { round: number | RoundInfo | null | undefined }): number {
  const r = c.round;
  return typeof r === "number" ? r : r?.round ?? 0;
}
