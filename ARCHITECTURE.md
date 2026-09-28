# ChitChain — Architecture (v3)

> A trust-minimised chit fund on MST Blockchain. **The pot sits in a smart contract, not in anyone's account.** The contract collects contributions, runs the auction, pays the winner and covers missed payments from collateral automatically. An AI risk engine prices each member's collateral, and an AI agent bids on members' behalf.

Built for MST Blockchain × NEWRRO Buildathon 2026 — MST Blockchain Track.

**v3 changes:** two-phase rounds (contribution window, then bidding window), per-circle `holdbackBps`, `maxDiscountBps` and collateral multipliers, `DefaultDetected` event with explicit `shortfall`, per-circle `defaults`/`collateralUsed`, on-chain round history, risk score flipped to 0 = safest / 100 = riskiest, currency shown as MST with an MST TESTNET badge, Postgres + Prisma index.

**v2 changes (from review):** `Unassessed` tier with max collateral, tier snapshotted at join, post-win security holdback + circle reserve, defined rules for removed members and early completion, join deadline + cancel/leave, fees and dividends via pull payments, dust rule, cold-start scoring, `nonReentrant` on settle, revised cut order (keep the agent), corrected demo transaction count, custodial-agent disclosure.

---

## 1. Verified vs. to-verify facts about MST

| Item | Status | Value / action |
|---|---|---|
| EVM-compatible (Solidity) | Verified (npm: `@mstblockchain/mst-sdk` depends on `ethers ^6`) | Write contracts in Solidity |
| Testnet RPC | Verified (SDK README) | `https://testnetrpc.mstblockchain.com` |
| Scaffold | Verified (npm: `@mstblockchain/mst-vibe-kit`) | Hardhat + Next.js + MST testnet config |
| Explorer | From guide | `https://mstscan.com` |
| Faucet | From guide | `https://faucet.masterstroke.academy` |
| Chain ID | Verified (RPC `eth_chainId`, VibeKit) | `91562037` |
| Block time & gas cost | **TO VERIFY** | Check on MSTScan before claiming in pitch |
| BridgeKey provider API | **TO VERIFY** | Assume EIP-1193 (`window.ethereum`-style); confirm |
| MSTScan tx URL format | Verified (Blockscout) | `https://testnet.mstscan.com/tx/<hash>`, `/address/<addr>` |
| MCP endpoint write support | **TO VERIFY** | `https://mcp.mstblockchain.com/sse` — read-only or can send txs? |

---

## 2. System overview

See `architecture.png` / `architecture.mmd`.

```
Members (BridgeKey) ──signed txs──►  ChitChain.sol (MST testnet)  ──►  MSTScan
        │                                  ▲        │ events
        ▼                                  │        ▼
Frontend (Next.js) ◄──REST/poll──►  Backend: Keeper · Indexer · Risk Engine · Bidding Agent ◄──► LLM API
```

**Separation of duties (pitch line):**
- **Blockchain = custody + rules.** Holds all money; enforces contributions, auction, payouts, penalties, security holdback.
- **AI = judgement.** Risk engine prices collateral; bidding agent decides when/how much to bid. AI never holds member funds except the disclosed demo agent wallets (§9). Its only privileged on-chain power is `setRiskTier`.

---

## 3. Smart contract — `ChitChain.sol`

Single contract, many circles (one address for the submission form). Native MST. Solidity ^0.8.20, OpenZeppelin `ReentrancyGuard`.

### 3.1 Types and state

```solidity
enum Status { Open, Active, Completed, Cancelled }
enum Tier   { Unassessed, Low, Medium, High }   // Unassessed = zero value = treated as High

struct CircleParams {         // everything the creator configures (one calldata struct)
    uint256 contribution;         // per member per round (wei)
    uint256 baseCollateral;       // Medium-tier reference; ≥ contribution
    uint8   maxMembers;           // 3–20
    uint32  contributionDuration; // seconds contributions stay open (demo: 30)
    uint32  biddingDuration;      // seconds bidding stays open after that (demo: 30)
    uint32  joinWindow;
    uint16  feeBps;               // ≤ 300; to circle reserve first
    uint16  holdbackBps;          // 0–10000 flat share of a winner's payout locked until completion
    uint16  maxDiscountBps;       // ≤ 5000; max bid discount as share of expected pot
    uint16  lowBps; uint16 mediumBps; uint16 highBps;   // collateral multipliers (defaults 5000/10000/20000)
}
struct Circle {
    address creator;
    CircleParams params;
    uint64  joinDeadline;
    Status  status;
    uint8   round;                // 1-based
    uint64  contributionDeadline; // round start + contributionDuration
    uint64  biddingDeadline;      // contributionDeadline + biddingDuration (= settle-able time)
    uint256 reserve;              // fees + forfeits; covers shortfalls; leftover → treasury at end
    uint256 collected;
    address[] members;            // join order (deterministic tie-breaks)
}
struct RoundRecord { address winner; uint64 settledAt; uint256 pot; uint256 payout; uint256 discount; uint256 fee; uint256 holdback; }

struct MemberState {
    bool    joined;
    Tier    tier;             // SNAPSHOT at join — later oracle updates don't affect this circle
    bool    hasWon;
    bool    removed;          // could not cover a missed payment → out of the circle
    uint256 collateral;       // locked; covers missed payments (includes holdback)
    uint256 claimable;        // pull balance: payouts, dividends, refunds
    uint32  defaults;         // missed contributions in this circle
    uint256 collateralUsed;   // collateral consumed to cover misses in this circle
}

struct Reputation { uint32 paidOnTime; uint32 missed; uint32 circlesCompleted; uint32 circlesRemoved; }

mapping(uint256 => Circle) circles;
mapping(uint256 => mapping(address => MemberState)) ms;
mapping(uint256 => mapping(uint8 => mapping(address => bool))) paid;
mapping(uint256 => mapping(uint8 => mapping(address => uint256))) bidOf;   // discount
mapping(uint256 => mapping(uint8 => address)) bestBidder;                  // updated on each bid
mapping(address => Tier) public riskTier;          // global, set by oracle
mapping(address => Reputation) public reputation;
uint256 public treasuryClaimable;
address public riskOracle; address public treasury;
```

### 3.2 Collateral and security rules

**Pre-win collateral (at `join`):**
```
preWin(tier) = baseCollateral × { Low: lowBps, Medium: mediumBps, High: highBps, Unassessed: highBps } / 10000
defaults: 0.5× / 1× / 2×  (per circle, low ≤ medium ≤ high)
createCircle requires baseCollateral ≥ contribution
```
An unassessed (possibly Sybil) wallet pays the maximum — fixes the enum-default bug.

**Post-win security (at `settleRound`, for the winner):**
After winning, the member still owes `owed = contribution × k`, where `k` = number of active members who have not yet won (upper bound on remaining rounds).
```
coverage(tier) = { Low: 50%, Medium: 75%, High: 100%, Unassessed: 100% }
tierGap  = max(0, owed × coverage(tier) − collateral)
flatHold = payout × holdbackBps / 10000              // per-circle, configurable
holdback = min(payout, max(tierGap, flatHold))
payout  −= holdback ; collateral += holdback         // winner's own money secures their future dues
emit HoldbackApplied
```
- High/Unassessed winners are **fully** secured → the pool cannot be left short by them.
- Low/Medium winners get more cash up front (the reward for reputation); the uncovered slice is backed by the **circle reserve** (fees + forfeits). Pitch honestly: *"trust is priced, not free."*
- Holdback is returned with remaining collateral at completion.

### 3.3 Round phases and settlement

Each round starts at `T` (circle start or previous settlement):
- `contribute` allowed while `now ≤ T + contributionDuration` (else `ContributionClosed`)
- `placeBid` allowed while `now ≤ T + contributionDuration + biddingDuration` (else `BiddingClosed`); bids may be placed during the contribution phase too
- `settleRound` allowed only after the bidding deadline (else `BiddingNotOver`)

`settleRound(circleId)` (anyone — the keeper in the MVP — `nonReentrant`, no external calls). **The deduction happens inside the contract**; the keeper only triggers it.

```
1. MISSED PAYMENTS — for each active (not removed) member who didn't pay this round:
     defaults++ ; missed++
     if collateral ≥ contribution: collateral −= contribution; collateralUsed += contribution; pot += contribution
                                   emit DefaultDetected(circle, round, member, required, fromCollateral=contribution, fromReserve=0, shortfall=0)
     else: fromCollateral = collateral; fromReserve = min(contribution − fromCollateral, reserve)
           shortfall = contribution − fromCollateral − fromReserve     // the real hole in the pot, never hidden
           collateral = 0; reserve −= fromReserve; pot += fromCollateral + fromReserve
           removed = true; circlesRemoved++
           emit DefaultDetected(…, shortfall) ; emit Removed(circle, round, member)
   For each member who paid on time: paidOnTime++
2. pot = sum of contributions actually collected/covered this round
3. fee = pot × feeBps / 10000 → reserve
4. WINNER — eligible = active, not removed, !hasWon
     highest discount bidder among eligible (bestBidder, tie → earlier bid wins; enforced in placeBid by strict >)
     no valid bid → first eligible member in join order
     no eligible member → skip payout, pot → dividends to active members, go to 8
5. payout = pot − discount − fee ; apply post-win holdback (3.2)
6. dividends = discount split equally among OTHER active (not removed) members
     remainder (dust) → first eligible recipient in join order
7. credit winner.claimable += payout ; hasWon = true ; emit RoundSettled(...)
7b. store RoundRecord{winner, settledAt, pot, payout, discount, fee, holdback} (getRoundHistory)
8. COMPLETION — if every active member has won → Completed:
     each active member: claimable += collateral (incl. holdback); collateral = 0; circlesCompleted++
     treasuryClaimable += reserve; reserve = 0 ; emit CircleCompleted
   else round++, contributionDeadline = now + contributionDuration, biddingDeadline = contributionDeadline + biddingDuration
```

**Removed members (never won):** their collateral and past contributions are **forfeited** to the pool (already distributed via pots/reserve). MVP rule, stated plainly; production would refund past contributions minus a penalty after the circle ends.
**Removed members (already won):** can only happen for Low/Medium tier after reserve is exhausted — this is the residual risk disclosed in §9.
**Dividends** go only to active, non-removed members.

### 3.4 Functions

| Function | Who | Notes |
|---|---|---|
| `createCircle(CircleParams)` | anyone | Validates ranges; `baseCollateral ≥ contribution`; `feeBps ≤ 300`; `holdbackBps ≤ 10000`; `maxDiscountBps ≤ 5000`; `lowBps ≤ mediumBps ≤ highBps`, `highBps > 0` |
| `join(id)` payable | member | Before `joinDeadline`; `msg.value == preWin(riskTier[sender])`; snapshots tier; auto-starts when full |
| `leave(id)` | member | Only while `Open`; refunds collateral to `claimable` |
| `cancel(id)` | anyone | After `joinDeadline` if not full → `Cancelled`; all collateral → `claimable` |
| `contribute(id)` payable | active member | `msg.value == contribution`, before the contribution deadline, once per round |
| `placeBid(id, discount)` | eligible member | `discount ≤ maxDiscountBps of expected pot`; strictly greater than current best (earliest wins ties); UI shows it as "payout I'd accept" = pot − discount |
| `settleRound(id)` | anyone (keeper) | §3.3; `nonReentrant` |
| `setRiskTier(member, tier)` | `riskOracle` | Global; affects only future joins (snapshot at join) |
| `withdraw(id)` | member | Pull `claimable`; `nonReentrant` |
| `withdrawTreasury()` | treasury | Pull `treasuryClaimable` |
| views | anyone | `getCircle`, `getMembers`, `getMember`, `getRound`, `getRoundHistory`, `requiredCollateral` |

`receive()` and `fallback()` revert.

### 3.5 Events

`CircleCreated`, `Joined(id, member, tier, collateral)`, `Left`, `CircleStarted(id, contributionDeadline, biddingDeadline)`, `CircleCancelled`, `Contributed(id, round, member, amount)`, `BidPlaced(id, round, member, discount)`, `DefaultDetected(id, round, member, required, fromCollateral, fromReserve, shortfall)`, `Removed(id, round, member)`, `HoldbackApplied(id, member, amount)`, `RoundSettled(id, round, winner, payout, discount)`, `CircleCompleted`, `RiskTierSet(member, tier)`.

### 3.6 Known limits (put in README)

- **Bids are public** → last-second sniping possible. Acceptable for MVP; production: commit-reveal auction.
- **Keeper/oracle are single wallets** → production: anyone can settle (already true), oracle behind multisig.
- **Low/Medium early winners are not 100% collateralised** → covered by reserve up to its balance; this residual risk is the price of the reputation discount.

### 3.7 Test list (Hardhat)

1. 5-member happy path; all balances reconcile to the wei (sum in = sum out + treasury).
2. `Unassessed` wallet must pay 2× collateral; Low pays 0.5×.
3. Tier changed by oracle after join → circle uses snapshot.
4. Pre-win miss covered from collateral; pot full; `Covered` emitted.
5. Pre-win misses exhaust collateral → `Removed`; circle completes with fewer rounds.
6. High-tier round-1 winner → holdback makes collateral ≥ owed; later defaults fully covered.
7. Low-tier round-1 winner defaults → collateral then reserve cover; reserve accounting correct.
8. No bids → first eligible wins; tie → earlier bid wins (strict `>` check).
9. Round with no eligible winner → pot distributed as dividends.
10. Dust goes to first eligible recipient.
11. Circle not full by deadline → `cancel` refunds all; `leave` works while Open.
12. Re-entrancy attempt on `withdraw` fails; `settleRound` twice in same round reverts.

---

## 4. Backend — Node.js + Express (TypeScript)

```
backend/src/
  chain.ts        # ethers v6 provider; keeper + riskOracle + agent wallets
  indexer.ts      # poll getLogs every 3 s → SQLite
  keeper.ts       # every 3 s: deadline passed → settleRound()
  risk/{features,score,explain,seed}.ts
  agent/bidder.ts
  routes.ts · db.ts
```

### 4.1 Risk engine — a heuristic, not a credit score

- **Features:** `onTimeRate = paidOnTime / (paidOnTime + missed)`, `circlesCompleted`, `circlesRemoved`, plus synthetic seeded history for demo wallets (labelled `SYNTHETIC`).
- **Cold start:** if `paidOnTime + missed == 0` → riskScore = 40 (MEDIUM). No division by zero.
- **Heuristic (weights are judgement calls — say so). 0 = safest, 100 = riskiest:**
  ```
  riskScore = clamp(60 − 40 × onTimeRate − 10 × min(circlesCompleted, 3)/3 + 30 × (circlesRemoved > 0), 0, 100)
  LOW risk ≤ 39 · MEDIUM 40–69 · HIGH ≥ 70      (cold start = 40 → MEDIUM)
  ```
  Labelled "Demo heuristic risk model" in the UI.
- **LLM:** 2-sentence explanation from the factors only. Template fallback if the call fails.
- **On-chain:** `POST /members/:addr/assess` → `setRiskTier`.

### 4.2 Bidding agent — the main agentic feature (keep it)

1. Member states a goal: "I need ₹15k before Diwali" / "I'm not in a hurry, maximise dividends".
2. LLM returns strict JSON `{ bidThisRound: bool, discountPct: number, reason: string }` (zod-validated).
3. Agent reads live state (current best bid, rounds left, pot) and re-plans each round — this is what makes it an agent, not a form.
4. Clamps to the contract cap, calls `placeBid` from the member's agent wallet, logs reason + tx hash.
5. **Disclosure:** agent wallets are custodial (backend holds keys) in the MVP. Production: session keys / spending-limited delegation.

### 4.3 REST API

`GET /circles` · `GET /circles/:id` · `GET /members/:addr/risk` · `POST /members/:addr/assess` · `POST /agent/bid` · `GET /feed?since=` (polling). Optional later: SSE, `/circles/:id/pool-check`.

---

## 5. Frontend — Next.js + Tailwind + shadcn/ui

| Page | Content |
|---|---|
| `/` | Pitch line + circles list |
| `/create` | Contribution, members, round seconds, join window, fee |
| `/circle/[id]` | Member cards (tier, paid ✓/✗, collateral bar, holdback, won/removed badge), countdown, pot, reserve, Contribute / Bid / Withdraw, **agent box with reasoning**, live feed with MSTScan links |
| `/member/[addr]` | Heuristic score, tier, explanation, on-chain history |
| `/demo` | Fund wallets, "skip payment" toggle for a member, new circle |

Feed uses **polling every 2–3 s** (SSE is optional polish).

---

## 6. Repo and env

```
chitchain/ contracts/ test/ scripts/ deployments/ backend/ frontend/
           README.md ARCHITECTURE.md architecture.png
```
```
MST_RPC_URL=https://testnetrpc.mstblockchain.com
MST_CHAIN_ID=<verify>
DEPLOYER_PRIVATE_KEY=  KEEPER_PRIVATE_KEY=  RISK_ORACLE_PRIVATE_KEY=  AGENT_WALLET_KEYS=
TREASURY_ADDRESS=  CHITCHAIN_ADDRESS=  LLM_API_KEY=
NEXT_PUBLIC_CHITCHAIN_ADDRESS=  NEXT_PUBLIC_API_URL=  NEXT_PUBLIC_EXPLORER=https://mstscan.com
```
Never commit keys. Frontend → Vercel, backend → Railway.

---

## 7. Demo script (≈3 min, 30-second rounds, 3 rounds shown)

| Step | On-chain txs |
|---|---|
| Assess A–E (D has bad synthetic history → High; A Low) | 5 × `setRiskTier` |
| Create circle (5 members, 30 s rounds) | 1 |
| All join; show D locking 2× and A 0.5× | 5 |
| Round 1: all contribute; B's agent bids "need money now" → B wins, holdback shown | 5 + 1 + 1 settle |
| Round 2: **D skips** → keeper settles → `Covered`, D's collateral bar drops, **pot still full** | 4 + 1 settle |
| Withdraw B's payout | 1 |
| **Total** | **≈ 24 transactions** |

Claim in pitch: **"20+ real testnet transactions in about three minutes; nobody ever held the money."** Pre-create the circle and pre-assess wallets if the slot is shorter; show those txs on MSTScan instead.

---

## 8. 24-hour build order

| Hours | Work |
|---|---|
| 0–1 | Scaffold, faucet, verify chain ID / BridgeKey / MSTScan URL |
| 1–7 | Contract + full test list (§3.7) + testnet deploy |
| 1–7 | Frontend skeleton, wallet, circle room (parallel, using ABI draft) |
| 7–10 | Keeper + indexer + polling feed |
| 10–13 | Risk engine + assess + profile page |
| 13–16 | Bidding agent + agent box |
| 16–20 | Demo console, end-to-end rehearsal on testnet |
| 20–22 | README (address, tx hashes), deploy, demo video |
| 22–24 | Buffer, pitch rehearsal, Instagram reel |

**Cut order if late:** SSE (already polling) → pool-check → profile polish → holdback UI polish. **Never cut:** contract correctness, collateral cover, bidding agent, MSTScan links.

---

## 9. Honest limits + business + legal (one slide)

- Risk score is a **heuristic** on synthetic demo data, not a credit bureau.
- Keeper, risk oracle and **agent wallets are custodial/centralised** in the MVP.
- Public bids can be sniped; commit-reveal later.
- Low/Medium early winners are partially secured; residual risk backed by the circle reserve.
- MST is volatile → production needs a rupee-pegged asset.
- Records are **tamper-evident**; contracts still need testing and an audit before real money.
- **Business model:** 1–2% fee per circle + software for registered chit companies.
- **Legal:** chit funds are regulated under the Chit Funds Act, 1982 → ChitChain is infrastructure for registered organisers and informal friend circles, not an unregistered chit company.
