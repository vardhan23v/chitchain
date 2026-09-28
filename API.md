# ChitChain — Backend REST contract (frontend ↔ backend)

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). All bigint/wei values are **decimal strings**. Addresses are checksummed. Timestamps are unix seconds. CORS allows `FRONTEND_ORIGIN`.

## Shapes
```ts
type Tier = 0|1|2|3;            // Unassessed, Low, Medium, High
type Status = 0|1|2|3;          // Open, Active, Completed, Cancelled

interface CircleSummary {       // = contract CircleView (v2) + id + isDemo
  id: number; creator: string; contribution: string; baseCollateral: string; maxMembers: number;
  contributionDuration: number; biddingDuration: number; joinDeadline: number; feeBps: number;
  holdbackBps: number; maxDiscountBps: number; lowBps: number; mediumBps: number; highBps: number;
  status: Status; round: number; contributionDeadline: number; roundDeadline: number /* = bidding deadline */;
  reserve: string; memberCount: number; isDemo: boolean;
}
interface RoundInfo { round: number; contributionDeadline: number; deadline: number /* bidding deadline */; expectedPot: string; collected: string; bestBidder: string; bestDiscount: string; maxDiscount: string; lowestAcceptedPayout: string /* expectedPot − bestDiscount */; phase: "contribution"|"bidding"|"settling"; }
interface MemberInfo { address: string; label: string|null; custodial: boolean; joined: boolean; tier: Tier; hasWon: boolean; removed: boolean; collateral: string; collateralUsed: string; defaults: number; claimable: string; paidThisRound: boolean; bidThisRound: string; requiredCollateral: string; contributionStatus: "PAID"|"PENDING"|"COVERED_BY_COLLATERAL"|"PARTIALLY_COVERED"|"DEFAULTED"; lastDefault: DefaultInfo|null; }
interface DefaultInfo { round: number; required: string; fromCollateral: string; fromReserve: string; shortfall: string; remainingCollateral: string; status: "COVERED_BY_COLLATERAL"|"PARTIALLY_COVERED"; potFullyFunded: boolean; txHash: string; ts: number; }
interface RoundHistoryRow { round: number; winner: string|null; winnerLabel: string|null; pot: string; payout: string; discount: string; fee: string; holdback: string; dividendsTotal: string; dividendPerMember: string; settledAt: number; txHash: string|null; }
interface FeedEvent { id: number; circleId: number|null; round: number|null; name: string; args: Record<string,string|number|boolean>; txHash: string; logIndex: number; block: number; ts: number; agent: { reason: string; member: string } | null; }
interface RiskResult { address: string; score: number /* 0 = safest, 100 = riskiest; LOW <=39, MEDIUM 40-69, HIGH >=70 */; tier: Tier; onChainTier: Tier; factors: { name: string; value: string; effect: string }[]; explanation: string; explanationSource: "llm"|"template"; dataSource: "SYNTHETIC"|"ONCHAIN"|"MIXED"; reputation: { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number }; history: FeedEvent[]; }
interface AgentLog { id: number; circleId: number; round: number; member: string; agentWallet: string; bidThisRound: boolean; discount: string; reason: string; source: "llm"|"fallback"; txHash: string|null; error: string|null; ts: number; }
interface Mandate { circleId: number; member: string; goal: string; desiredPayout: string|null /* wei */; maxDiscountPct: number|null; urgency: "low"|"medium"|"high"|null; riskTolerance: "low"|"medium"|"high"|null; active: boolean; createdAt: number; }
```

## Endpoints
| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ ok, chainId, latestBlock, lastIndexedBlock, contract, keeper, explorer }` |
| GET | `/stats` | `{ circlesLive, circlesTotal, mstcInContract (string wei), txCount }` |
| GET | `/circles` | `{ circles: CircleSummary[] }` newest first |
| GET | `/circles/:id` | `{ circle: CircleSummary, round: RoundInfo, members: MemberInfo[], txCount, mandates: Mandate[], latestDefault: (DefaultInfo & {member, label}) | null }` |
| GET | `/circles/:id/rounds` | `{ rounds: RoundHistoryRow[] }` settled rounds ascending (from `getRoundHistory` + indexed `RoundSettled` tx) |
| GET | `/circles/:id/defaults` | `{ defaults: (DefaultInfo & {member, label})[] }` newest first |
| GET | `/members/:addr/activity?limit=` | `{ events: FeedEvent[] }` every indexed event involving the address (member/winner/bidder), newest first, with `circleId` |
| GET | `/members/:addr/circles` | `{ circles: (CircleSummary & { me: MemberInfo })[] }` circles the address joined |
| GET | `/feed?circleId=&since=&limit=` | `{ events: FeedEvent[] }` ascending by id; `since` = last seen id; omit circleId for global (max 100) |
| GET | `/members/:addr/risk` | `RiskResult` (cached compute, no tx) |
| POST | `/members/:addr/assess` | `RiskResult & { txHash }` — computes and sends `setRiskTier` |
| POST | `/agent/mandate` body `{ circleId, member, goal, desiredPayout? (MST decimal string), maxDiscountPct?, urgency?, riskTolerance? }` | `{ mandate: Mandate, decision: AgentLog|null }` — stores mandate and runs one decision immediately if the circle is Active |
| DELETE | `/agent/mandate?circleId=&member=` | `{ ok }` |
| GET | `/agent/logs?circleId=&limit=` | `{ logs: AgentLog[] }` newest first |
| GET | `/demo/state` | `{ wallets: DemoWallet[], txCount, contract, circleId (latest demo circle or null) }` where `DemoWallet = { label: "A".."E", address, balance (wei string), tier, skip: boolean, custodial: true }` |
| POST | `/demo/fund` | funds demo wallets from deployer → `{ txHashes }` |
| POST | `/demo/assess-all` | `{ results: (RiskResult & {txHash})[] }` |
| POST | `/demo/skip` body `{ address, skip }` | `{ ok }` — when skip=true the demo autopilot does not contribute for that wallet |
| POST | `/demo/new-circle` body `{ contributionDuration?=30, biddingDuration?=30, contribution?="0.1" (MST), holdbackBps?=1000, maxDiscountBps?=4000 }` | `{ circleId, txHash }` — creates a circle **and joins all 5 demo wallets** |
| POST | `/demo/withdraw` body `{ address, circleId }` | `{ txHash }` |
| POST | `/circles/:id/settle` | `{ txHash }` — keeper settles now if the deadline passed (UI "Settle round" button fallback) |

Errors: `{ error: string, code?: string }` with 4xx/5xx.

## Demo wallets (custodial, disclosed in UI)
`AGENT_WALLET_KEYS` = five comma-separated private keys for demo members **A–E**. The backend holds them and, for circles it created via `/demo/new-circle` ("demo circles"), it auto-contributes each round (unless `skip` is set) and places the AI agent's bids from the member's own wallet. The UI must label these wallets "custodial demo wallet". Real users join with BridgeKey; the agent can only bid for demo wallets.

## Currency
All amounts are **MST testnet coins** (18 decimals). The UI labels them `MST` and shows an `MST TESTNET` badge; never ₹ or any fiat.

## Feed labels
The backend attaches `label` (A–E) to demo wallet addresses; the frontend shows `label ?? shortAddr`.
