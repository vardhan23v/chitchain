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
| GET | `/health` | `{ ok, chainId, latestBlock, lastIndexedBlock, contract, keeper, explorer, adminPasswordLogin }` |
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

---

# v3 — Wallet login, roles, audit, support

## Principle
People operate the platform; the smart contract controls the funds. No role, endpoint or backend process can move member funds: the v2 contract has no admin/organizer fund functions at all (creator is only stored, payouts are pull-only, settlement is permissionless). Roles below only gate *website* actions.

## Auth (SIWE-style, bearer sessions)
```ts
type Role = "MEMBER" | "ORGANIZER" | "ADMIN";
interface User { walletAddress: string /* lowercase */; role: Role; status: "ACTIVE"|"SUSPENDED"; displayName: string|null; createdAt: number; lastLogin: number|null; }
```
| Method | Path | Body → Response |
|---|---|---|
| POST | `/auth/nonce` | `{ address }` → `{ nonce, message, expiresAt }` (rate-limited 10/min per IP and per address; nonce valid 5 min, one-time) |
| POST | `/auth/verify` | `{ address, nonce, signature }` → `{ token, expiresAt, user }` (401 `NONCE_INVALID` / `BAD_SIGNATURE`, 403 `SUSPENDED`) |
| GET | `/auth/me` | bearer → `{ user, session: { id, expiresAt } }` |
| POST | `/auth/logout` | bearer → `{ ok }` (revokes the session) |
| POST | `/auth/admin-login` | `{ username, password }` → `{ token, expiresAt, user }` — **platform-admin fallback only** (rate-limited 5/min per IP; 401 `BAD_CREDENTIALS`, 403 `SUSPENDED`, 404 `NOT_ENABLED` when the feature is off) |

### Admin password fallback
For the case where the platform administrator's wallet is unavailable. Enabled only when **both** `ADMIN_LOGIN_USER` (3–40 chars, lowercase `a-z0-9._-`) and `ADMIN_LOGIN_PASSWORD_HASH` (`scrypt$<saltHex>$<hashHex>`, N=16384 r=8 p=1 keylen 64 — generate with `cd backend && npm run hash-password -- '<password>'`) are set; `GET /health` then reports `adminPasswordLogin: true` and `GET /admin/config` shows `auth.adminPasswordLogin`. Credentials are compared in constant time; every attempt is audited as `auth.admin_login` ok/denied. On success the backend upserts a `User` with `walletAddress = "admin:<username>"` (**not** an on-chain address), role `ADMIN`, status `ACTIVE`, and issues a normal bearer session; `GET /auth/me`, `requireAuth` and the ADMIN checks work unchanged. Such a session has no wallet: `GET /me` returns `balance: "0"`, `risk: null`, zero totals and `activeCircle: null`; `GET /me/circles` returns `[]`. It grants website admin rights only — it can never sign transactions or move funds. Members and organizers always sign in with their wallet; there is no password login for them.

The client signs exactly the `message` string with `personal_sign` and never sends the message back; the server rebuilds it from the stored nonce. Message text:
```
ChitChain wants you to sign in with your MST wallet.

Domain: <frontend host>
Address: <checksummed address>
Chain ID: 91562037
Nonce: <nonce>
Issued At: <ISO>
Expires: <ISO>

ChitChain never asks for your seed phrase or private key.
```
Protected requests send `Authorization: Bearer <token>` (HS256 JWT, 24 h; role is re-read from the database on every request). Errors: 401 `NO_AUTH`/`BAD_TOKEN`/`SESSION_REVOKED`, 403 `FORBIDDEN`/`NOT_ORGANIZER`/`SUSPENDED`, 429 `RATE_LIMITED`.

Roles: everyone is `MEMBER` on first login; addresses listed in `PLATFORM_ADMIN_ADDRESSES` become `ADMIN`; a member becomes `ORGANIZER` when they claim a circle they created on-chain (`POST /circles/:id/claim`). Admins can change roles/status in `/admin/users`.

## Authorization matrix
| Access | Endpoints |
|---|---|
| Public | `GET /health`, `GET /circles*`, `GET /stats`, `GET /feed`, `GET /members/:addr/{activity,circles,risk}`, `GET /agent/logs`, `GET /demo/state`, `POST /circles/:id/settle` (anyone can settle on-chain; 5/min per IP) |
| Signed in | `GET /auth/me`, `POST /auth/logout`, `GET /me`, `GET /me/circles`, `GET /me/invites`, `PATCH /me`, `POST /support`, `GET /support/mine`, `POST /circles/:id/claim` |
| Self or ADMIN | `POST /members/:addr/assess` |
| Organizer of the circle or ADMIN | `POST/DELETE /agent/mandate`, `POST /organizer/circles/:id/meta`, `GET/POST/DELETE /organizer/circles/:id/invites[/:addr]`, `GET /organizer/circles/:id/analytics` |
| ORGANIZER or ADMIN | `GET /organizer/circles` |
| ADMIN | `POST /demo/{fund,assess-all,skip,new-circle,withdraw}`, everything under `/admin` |

## New shapes
```ts
interface CircleSummary { /* v2 fields */ name: string|null; organizerWallet: string|null; }
interface MeOverview { user: User; balance: string /* wei */; risk: RiskResult|null; totals: { contributions: string; payouts: string; dividends: string; defaults: number; circles: number }; activeCircle: (Omit<CircleSummary,"round"> & { roundNumber: number; round: RoundInfo; me: MemberInfo }) | null; }
interface Invite { circleId: number; walletAddress: string /* invitee, lowercase */; circle: CircleSummary|null; invitedBy: string; createdAt: number; }
interface OrganizerCircle extends Omit<CircleSummary,"round"> { roundNumber: number; round: RoundInfo; members: MemberInfo[]; pendingContributions: number; defaults: number; collateralTotal: string; lowestAcceptedPayout: string; }
interface CircleAnalytics { circle: CircleSummary; roundNumber: number; round: RoundInfo; members: MemberInfo[]; rounds: RoundHistoryRow[]; defaults: (DefaultInfo & {member,label})[]; contributionRate: number /* 0..1 this round */; agentDecisions: number; recentEvents: FeedEvent[]; }
interface AuditRow { id: number; ts: number; actorWallet: string|null; role: string /* MEMBER|ORGANIZER|ADMIN|SYSTEM|KEEPER|AGENT|AUTOPILOT|ORACLE */; action: string; target: string|null; result: string; txHash: string|null; meta: Record<string,unknown>|null; }
interface SupportTicket { id: number; userWallet: string; subject: string; message: string; status: "OPEN"|"CLOSED"; adminNote: string|null; createdAt: number; updatedAt: number; }
interface LoopStatus { name: string; everyMs: number; ticks: number; errors: number; lastTickAt: number|null; lastOkAt: number|null; lastError: string|null; busy: boolean; }
interface AdminOverview {
  users: { total: number; active: number; byRole: Record<Role, number>; suspended: number };
  circles: { total: number; open: number; active: number; completed: number; cancelled: number; demo: number };
  mst: { locked: string; pots: string; collateral: string; reserve: string } /* wei */;
  defaults: number; tx: { total: number; sent: number; mined: number; failed: number; lastFailure: string|null };
  tickets: { open: number }; audit: { last24h: number };
  chain: { chainId: number; latestBlock: number; lastIndexedBlock: number|null; lag: number; connected: boolean };
  contract: { address: string|null; status: "ACTIVE"|"NOT_CONFIGURED"; explorer: string };
  loops: LoopStatus[]; keeper: { address: string|null; balance: string; status: "ONLINE"|"STALE"|"OFFLINE" };
  wallets: { deployer: {address,balance}|null; oracle: {address,balance}|null };
}
```

## New endpoints
| Method | Path | Response |
|---|---|---|
| GET | `/me` | `MeOverview` |
| GET | `/me/circles` | `{ circles: (CircleSummary & { me: MemberInfo })[] }` |
| GET | `/me/invites` | `{ invites: Invite[] }` |
| PATCH | `/me` `{ displayName }` | `{ user }` |
| POST | `/circles/:id/claim` `{ name, description?, txHash? }` | `{ circle: CircleSummary, user }` — caller must be the on-chain creator (403 `NOT_CREATOR`); promotes MEMBER → ORGANIZER |
| GET | `/organizer/circles` | `{ circles: OrganizerCircle[] }` (ADMIN: all circles) |
| POST | `/organizer/circles/:id/meta` `{ name, description? }` | `{ circle }` |
| GET | `/organizer/circles/:id/invites` | `{ invites: Invite[] }` |
| POST | `/organizer/circles/:id/invites` `{ addresses: string[] }` | `{ invites: Invite[] }` |
| DELETE | `/organizer/circles/:id/invites/:addr` | `{ ok }` |
| GET | `/organizer/circles/:id/analytics` | `CircleAnalytics` |
| POST | `/support` `{ subject, message }` | `{ ticket }` (5/min per wallet) |
| GET | `/support/mine` | `{ tickets }` |
| GET | `/admin/overview` | `AdminOverview` |
| GET | `/admin/users?role&status&q&limit` | `{ users: (User & { circles: number })[] }` |
| PATCH | `/admin/users/:addr` `{ role?, status?, displayName? }` | `{ user }` (409 `LAST_ADMIN`, 400 `CANNOT_EDIT_SELF_ROLE`) |
| GET | `/admin/audit?limit&actor&action&since` | `{ rows: AuditRow[] }` newest first |
| GET | `/admin/support?status` | `{ tickets }` |
| PATCH | `/admin/support/:id` `{ status?, adminNote? }` | `{ ticket }` |
| GET | `/admin/config` | safe config subset (never keys, never DATABASE_URL) |
| GET | `/health` | adds `loops: LoopStatus[]`, `tx`, `indexerHealthy` |

Notes: `PATCH /admin/users/:addr` with `status: "SUSPENDED"` revokes the user's sessions; a role change does not (the role is re-read from the database per request, so existing tokens pick it up immediately). All `/auth/*` requests share a 60/min per-IP limiter on top of the 10/min nonce limits.

Audit rows are written for: logins (ok/denied), every admin mutation, organizer meta/invites, circle claims, member assess, support tickets, demo actions, keeper settlements, autopilot contributions, agent bids, oracle tier updates. The audit log is an application log; blockchain events remain the authority for blockchain state.

---

# v4 · Autonomous AI bidding

## Principle
The AI **decides**, the backend **executes**, and a deterministic **Risk Guard** sits between them. The decision service (`agent/`, Python + CrewAI, Railway service `ai-agent`) receives a strategy brief, the auction snapshot and recent activity, and returns one of `WAIT | BID | STOP` with a discount in MST. It has no wallet. The Node loop (`backend/src/ai/loop.ts`, listed in `/health` as `aiBidding`, 4 s) re-validates every proposal with the Risk Guard and only then sends `placeBid(circleId, discount)` from the custodial demo wallet. If the crew is down, slow (> 20 s) or rate-limited, Node uses the same deterministic rules on its own (`fallback.ts`). Testnet only, MST only, custodial demo wallets A–E only. Nothing is simulated: demo mode places a **real** rival bid from another custodial demo wallet, labelled "Demo rival".

A "bid" is the **discount** (wei) the member gives up; **desired payout** = pot − discount. `maxDiscount` (MST) and `maxDiscountPct` (% of pot) are hard caps on any bid.

## Shapes
```ts
interface BidAgent {
  id: string; userWallet: string; circleId: number; member: string /* custodial demo wallet, lowercase */; goal: string;
  desiredPayout: string|null /* wei */; maxDiscount: string /* wei */; maxDiscountPct: number /* 0-50 */;
  urgency: "low"|"medium"|"high"; riskTolerance: "low"|"medium"|"high"; durationSec: number|null /* null = until this auction (round) ends */;
  autonomous: boolean; demoMode: boolean; status: "ACTIVE"|"PAUSED"|"STOPPED"|"DONE"|"ERROR"; statusReason: string|null;
  lastDecision: "WAIT"|"BID"|"STOP"|null; lastReason: string|null; lastBid: string|null /* wei */; lastTxHash: string|null;
  failures: number; startedAt: number; expiresAt: number|null; updatedAt: number;
}
interface AgentEvent { id: number; agentId: string; ts: number; kind: AgentEventKind; text: string; reason: string|null; data: Record<string,unknown>|null; }
type AgentEventKind = "REFRESH"|"BID_SEEN"|"EVALUATED"|"DECISION"|"RISK_PASSED"|"RISK_BLOCKED"|"TX_SUBMITTED"|"TX_CONFIRMED"|"TX_FAILED"|"PAUSED"|"STOPPED"|"DONE"|"RIVAL_BID"|"INFO";
interface AuctionSnapshot {
  circleId: number; round: number; roundsTotal: number; status: "CONTRIBUTION"|"BIDDING"|"SETTLING"|"INACTIVE";
  expectedPot: string; collected: string; maxDiscount: string; bestDiscount: string; bestPayout: string /* wei */;
  bestBidder: string|null /* lowercase; null when nobody has bid */; bestBidderLabel: string|null /* "A".."E" for demo wallets */;
  biddingDeadline: number; contributionDeadline: number; secondsRemaining: number /* in the current phase */; bidCount: number;
  expectedPotMst: number; collectedMst: number; maxDiscountMst: number; bestDiscountMst: number; bestPayoutMst: number; nowSec: number;
}
interface AuctionBid { round: number|null; member: string; label: string|null; discount: string; payout: string|null /* wei, null if the round's pot is unknown */; txHash: string; block: number; ts: number; }
interface Decision { decision: "WAIT"|"BID"|"STOP"; discount: string|null /* wei */; discountMst: number|null; payout: string|null; reasonCode: string; reason: string; confidence: number; source: "crew"|"fallback"; analyst: Record<string,unknown>|null; }
```

## Endpoints
| Method | Path | Access | Response |
|---|---|---|---|
| POST | `/ai/bidding/start` `{circleId, member, goal, desiredPayout?: "4.5", maxDiscount: "1.0", maxDiscountPct: 20, urgency, riskTolerance, durationSec?: number\|null, autonomous: boolean, demoMode?: boolean}` (MST decimal strings) | organizer of the circle or ADMIN; `member` must be a custodial demo wallet (400 `NOT_DEMO_WALLET`) | `{agent}`; 409 `AGENT_EXISTS` when an ACTIVE/PAUSED agent exists for the same circle + member. Writes INFO "Agent activated". |
| POST | `/ai/bidding/pause` `{agentId}` | owner or ADMIN | `{agent}` (409 `BAD_STATE` unless ACTIVE) |
| POST | `/ai/bidding/resume` `{agentId, autonomous?: true}` | owner or ADMIN | `{agent}`; `autonomous: true` grants auto-bidding (the "Approve" button after "Needs your approval") |
| POST | `/ai/bidding/stop` `{agentId}` | owner or ADMIN | `{agent}` with status STOPPED, reason "Stopped by user" |
| GET | `/ai/bidding/status/:agentId` | public | `{agent, auction: AuctionSnapshot\|null}` |
| GET | `/ai/bidding/activity/:agentId?since=<eventId>&limit=100` | public | `{events: AgentEvent[]}` ascending by id |
| GET | `/ai/bidding/stream/:agentId` | public | SSE: `event: agent` `{agent}` on status change, `event: activity` `{event}` per new AgentEvent, `: ping` every 15 s. The last 50 events are replayed on connect. |
| GET | `/ai/bidding/mine?circleId=` | signed in | `{agents}` of the session user, newest first |
| POST | `/ai/bidding/evaluate` `{agentId}` | owner or ADMIN | `{decision: Decision\|null, agent}`: runs one tick now (409 `AGENT_BUSY` while a tick is running) |
| GET | `/auction/:circleId` | public | `AuctionSnapshot` |
| GET | `/auction/:circleId/bids?limit=50` | public | `{bids: AuctionBid[]}` from indexed `BidPlaced` events, newest first |

There is **no** `/ai/bidding/execute` route. Execution is only reachable through the loop, after the Risk Guard.

## Loop (per ACTIVE agent, every 4 s)
1. `expiresAt` passed → DONE "Strategy expired"; circle not Active → DONE "Circle is no longer active"; round advanced with `durationSec = null` → DONE "Auction ended" (with a duration, the agent keeps monitoring the next round).
2. Snapshot; REFRESH only when best discount / bid count / 30 s time bucket changed; BID_SEEN when the best discount changed ("New bid detected: 0.40 MST discount by C").
3. Not BIDDING → WAIT without an LLM call; agent already `bestBidder` → WAIT "You hold the winning bid".
4. Decision: `POST ${AI_AGENT_URL}/evaluate` (timeout 20 s), else `fallbackDecide()`. The crew's number is clamped (never above the caps, never below best + 1 % of pot). Events EVALUATED then DECISION ("Decision: BID 0.45 MST" / "Decision: WAIT"). LLM calls at most once per 20 s per agent unless the best discount changed.
5. BID with `autonomous = false` → DECISION "Autonomous bidding is off; bid not submitted", status PAUSED "Needs your approval".
6. Risk Guard → RISK_PASSED / RISK_BLOCKED (blocked → WAIT; `MAX_*` → DONE "Your maximum has been reached").
7. `preflight` + `sendTx` from the custodial wallet → TX_SUBMITTED `{txHash}` → 1 confirmation → TX_CONFIRMED `{txHash, block, ts, discount, payout}`; also an `agent_logs` row (room feed) and an audit row `ai.bid`.
8. TX_FAILED with the decoded revert; backoff 8 s × 2^failures; after 3 → PAUSED "Repeated transaction failures".
9. Demo mode: 25 s after activation, while ACTIVE in BIDDING and once per round, another eligible custodial demo wallet places a real bid (best + 2 % of pot, capped at 10 % of pot) → RIVAL_BID "Demo rival (wallet C) bid 0.20 MST" with `data.simulated = false, demoRival = true`.

## Risk Guard reasons (checked in this order; `backend/src/ai/riskGuard.ts`, pure and unit-tested)
`MAX_BID_EXCEEDED` (discount > `maxDiscount`), `MAX_DISCOUNT_PCT_EXCEEDED` (> `maxDiscountPct` of the expected pot), `ABOVE_CONTRACT_MAX` (> the round's `maxDiscount`), `NOT_HIGHER_THAN_BEST`, `AUCTION_NOT_ACTIVE` (status ≠ BIDDING), `WRONG_CIRCLE`, `WRONG_ROUND`, `STRATEGY_EXPIRED`, `AGENT_NOT_ENABLED` (status ≠ ACTIVE or `autonomous = false`), `WALLET_UNAUTHORIZED` (member is not a custodial demo wallet), `INSUFFICIENT_BALANCE` (wallet balance < 0.02 MST gas reserve, read with `provider.getBalance`), `NOT_ELIGIBLE` (not joined, already won, removed, or unpaid this round).

## Decision reason codes
Crew / fallback: `NOT_BIDDING`, `MAX_REACHED`, `PAYOUT_UNREACHABLE`, `PAYOUT_ACCEPTABLE`, `DESIRED_PAYOUT`, `URGENT`, `LOW_URGENCY`, `TIME_REMAINS`, `NEAR_EXPIRY`, `NO_AMOUNT`; the loop adds `QUIET` (non-bidding phases / holding the best bid) and a Risk Guard reason when blocked.

## Env
Backend: `AI_AGENT_URL` (Python service base URL; empty → deterministic fallback only). Agent service: `GROQ_API_KEY`, `CHITCHAIN_API_URL`, `MODEL` (default `groq/qwen/qwen3.8-27b`), `PORT`, optional `REASONING_EFFORT`, `LLM_RETRIES`, `EVALUATE_TIMEOUT_SEC`.
