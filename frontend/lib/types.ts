/** Shapes mirroring API.md (v2). Wei values are decimal strings (API) or bigint (chain); we normalise to string. */
export type Tier = 0 | 1 | 2 | 3; // Unassessed, Low, Medium, High
export type Status = 0 | 1 | 2 | 3; // Open, Active, Completed, Cancelled

/**
 * v2.2 round stage: contribution → closing (deadline passed, keeper covers misses) → decision (the recipient accepts the
 * full pot or declines) → bidding (only after a decline) → settling (a window passed, the keeper settles).
 */
export type RoundPhase = "contribution" | "closing" | "decision" | "bidding" | "settling";
/** On-chain round phase: 0 Contributing, 1 Deciding, 2 Auction. */
export type PhaseCode = 0 | 1 | 2;
export type RoundOutcome = "NONE" | "ACCEPTED" | "AUCTION" | "DECISION_TIMEOUT" | "NO_BIDS" | "NO_RECIPIENT";
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
  /** v2.2 on-chain phase of the current round, the decision deadline and the round's recipient (zero address while contributing). */
  phase?: PhaseCode;
  decisionDeadline?: number;
  recipient?: string;
}

export interface RoundInfo {
  round: number;
  contributionDeadline: number;
  /** auction deadline (0 until the recipient declines) */
  deadline: number;
  /** recipient decision deadline (0 while contributing) */
  decisionDeadline: number;
  expectedPot: string;
  /** contributions so far; after close, the assembled pot */
  collected: string;
  /** assembled pot once contributions closed, else "0" */
  pot: string;
  /** the pot payout offers are measured against (pot once closed, else expectedPot) */
  potForOffers: string;
  bestBidder: string;
  bestBidderName?: string | null;
  bestDiscount: string;
  maxDiscount: string;
  /** potForOffers − bestDiscount; null until someone bid */
  lowestAcceptedPayout: string | null;
  phase: RoundPhase;
  phaseCode: PhaseCode;
  /** designated recipient (first choice on the full pot); null while contributing */
  recipient: string | null;
  recipientLabel: string | null;
  recipientName: string | null;
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
  /** public username (null when the wallet has none) */
  username?: string | null;
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
  winnerName?: string | null;
  /** how the round ended (ACCEPTED = full pot taken, AUCTION = lowest payout offer won, …) */
  outcome?: RoundOutcome;
  recipient?: string | null;
  recipientLabel?: string | null;
  recipientName?: string | null;
  decisionTxHash?: string | null;
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

/** A demo wallet that cannot cover its next join/contribution (from /health `demo.underfunded` or a 409 DEMO_UNDERFUNDED body). */
export interface UnderfundedWallet {
  label?: string;
  address: string;
  /** wei */
  balance?: string;
  /** wei */
  required?: string;
  /** wei */
  shortfall?: string;
}

/** A service status chip: `ok` or a string status (e.g. "online", "degraded"). Shape is tolerant because backends differ. */
export interface ServiceHealth {
  ok?: boolean;
  status?: string;
  model?: string;
  provider?: string;
  error?: string | null;
  lastOkAt?: number | null;
  configured?: boolean;
  reachable?: boolean | null;
  baseUrl?: string | null;
}

/** GET /health. `demo`, `crew` and `llm` are absent on older backends. */
export interface Health {
  ok: boolean;
  chainId: number;
  latestBlock: number;
  lastIndexedBlock: number;
  contract: string;
  keeper: string;
  explorer: string;
  adminPasswordLogin?: boolean;
  loops?: LoopStatus[];
  demo?: { underfunded?: (UnderfundedWallet | string)[]; wallets?: (DemoWallet & Partial<UnderfundedWallet> & { underfunded?: boolean })[] };
  crew?: ServiceHealth | string | boolean;
  llm?: ServiceHealth | string | boolean;
}

/** GET /admin/treasury. Amounts in wei. */
export interface AdminTreasury {
  treasury: string;
  claimable: string;
  lastWithdrawTx: { txHash: string; ts: number; amount: string } | null;
}

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
  /** public username; the wallet address stays the on-chain identity */
  username?: string | null;
  createdAt: number;
  lastLogin: number | null;
}

export interface UsernameCheck {
  username: string;
  available: boolean;
  reason?: string;
  message: string | null;
  rule: string;
}

/** GET /members/:addr/profile — every count comes from the contract or indexed contract events. */
export interface Profile {
  address: string;
  username: string | null;
  label: string | null;
  custodial: boolean;
  riskTier: string | null;
  onChainTier: string | null;
  score: number | null;
  stats: {
    circles: number; completedRounds: number; contributions: number; contributedTotal: string; defaults: number;
    circlesCompleted: number; circlesRemoved: number; payouts: number; payoutsTotal: string; dividendsTotal: string;
  };
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
  /** null until someone made an offer */
  lowestAcceptedPayout: string | null;
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
  /** distinct on-chain transactions in the index */
  indexedTx?: number;
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

/* ───────── v4, autonomous AI bidding agent ───────── */

export type AgentStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "DONE" | "ERROR";
export type AgentDecisionKind = "WAIT" | "BID" | "STOP";
export type AgentEventKind =
  | "REFRESH" | "BID_SEEN" | "EVALUATED" | "DECISION" | "RISK_PASSED" | "RISK_BLOCKED"
  | "TX_SUBMITTED" | "TX_CONFIRMED" | "TX_FAILED" | "PAUSED" | "STOPPED" | "DONE" | "RIVAL_BID" | "INFO";

/** One autonomous bidding strategy for a custodial demo wallet (API.md v4). Wei values are decimal strings. */
export interface BidAgent {
  id: string;
  userWallet: string;
  circleId: number;
  member: string;
  goal: string;
  desiredPayout: string | null;
  maxDiscount: string;
  maxDiscountPct: number;
  urgency: Level;
  riskTolerance: Level;
  durationSec: number | null;
  autonomous: boolean;
  demoMode: boolean;
  status: AgentStatus;
  statusReason: string | null;
  lastDecision: AgentDecisionKind | null;
  lastReason: string | null;
  lastBid: string | null;
  lastTxHash: string | null;
  failures: number;
  startedAt: number;
  expiresAt: number | null;
  updatedAt: number;
}

export interface AgentEventData {
  discount?: string;
  payout?: string;
  txHash?: string;
  block?: number;
  ts?: number;
  confidence?: number;
  reasonCode?: string;
  simulated?: boolean;
  demoRival?: boolean;
  [k: string]: unknown;
}

export interface AgentEvent {
  id: number;
  agentId: string;
  ts: number;
  kind: AgentEventKind;
  text: string;
  reason: string | null;
  data: AgentEventData | null;
}

export type AuctionStatus = "CONTRIBUTION" | "DECISION" | "BIDDING" | "SETTLING" | "INACTIVE";

/** Public auction snapshot (`GET /auction/:circleId`). Wei strings plus `*Mst` numbers. */
export interface AuctionSnapshot {
  circleId: number;
  round: number;
  roundsTotal: number;
  status: AuctionStatus;
  expectedPot: string;
  collected: string;
  maxDiscount: string;
  bestDiscount: string;
  bestBidder: string;
  bestPayout: string;
  biddingDeadline: number;
  contributionDeadline: number;
  decisionDeadline?: number;
  recipient?: string | null;
  recipientLabel?: string | null;
  secondsRemaining: number;
  bidCount: number;
  expectedPotMst?: number;
  collectedMst?: number;
  maxDiscountMst?: number;
  bestDiscountMst?: number;
  bestPayoutMst?: number;
}

export interface AuctionBid {
  round: number;
  member: string;
  label: string | null;
  username?: string | null;
  discount: string;
  payout: string;
  txHash: string;
  block: number;
  ts: number;
}
