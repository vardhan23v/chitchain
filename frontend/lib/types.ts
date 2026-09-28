/** Shapes shared by API.md and INTERFACE.md. Wei values are decimal strings (API) or bigint (chain); we normalise to string. */
export type Tier = 0 | 1 | 2 | 3; // Unassessed, Low, Medium, High
export type Status = 0 | 1 | 2 | 3; // Open, Active, Completed, Cancelled

export interface CircleSummary {
  id: number;
  creator: string;
  contribution: string;
  maxMembers: number;
  roundDuration: number;
  joinDeadline: number;
  feeBps: number;
  baseCollateral: string;
  status: Status;
  round: number;
  roundDeadline: number;
  reserve: string;
  memberCount: number;
}

export interface RoundInfo {
  round: number;
  deadline: number;
  expectedPot: string;
  collected: string;
  bestBidder: string;
  bestDiscount: string;
  maxDiscount: string;
}

export interface MemberInfo {
  address: string;
  label: string | null;
  joined: boolean;
  tier: Tier;
  hasWon: boolean;
  removed: boolean;
  collateral: string;
  claimable: string;
  paidThisRound: boolean;
  bidThisRound: string;
  requiredCollateral: string;
  /** Present only when the backend supplied the member (demo wallets). */
  custodial?: boolean;
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

export interface Mandate {
  circleId: number;
  member: string;
  goal: string;
  maxDiscountPct: number | null;
  active: boolean;
  createdAt: number;
}

export interface CircleRoom {
  circle: CircleSummary;
  round: RoundInfo;
  members: MemberInfo[];
  txCount: number;
  mandates: Mandate[];
}

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
