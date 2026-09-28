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
