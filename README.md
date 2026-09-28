# ChitChain — the pot sits in a contract, not in anyone's account

[![Live app](https://img.shields.io/badge/live%20app-Railway-7C3AED?logo=railway&logoColor=white)](https://frontend-production-d322.up.railway.app)
[![Backend](https://img.shields.io/badge/backend-health-16A34A?logo=express&logoColor=white)](https://backend-production-64738.up.railway.app/health)
[![Contract](https://img.shields.io/badge/contract-0xA18D…bD45-C0392B?logo=ethereum&logoColor=white)](https://testnet.mstscan.com/address/0xA18D48c29Bf68B750BB3fCb2f109661C5de1bD45)
[![MST Testnet](https://img.shields.io/badge/MST%20Testnet-chain%2091562037-C0392B)](https://testnet.mstscan.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&logoColor=white)](contracts/ChitChain.sol)
[![Hardhat tests](https://img.shields.io/badge/Hardhat%20tests-29%20passing-F7DF1E?logo=ethereum&logoColor=black)](test)
[![No real money](https://img.shields.io/badge/money-MST%20TESTNET%20only-D97706)](#no-real-money)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](frontend)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](backend/prisma/schema.prisma)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway-4169E1?logo=postgresql&logoColor=white)](backend/prisma/schema.prisma)
[![CI](https://github.com/vardhan23v/chitchain/actions/workflows/ci.yml/badge.svg)](https://github.com/vardhan23v/chitchain/actions/workflows/ci.yml)
[![Deploy](https://github.com/vardhan23v/chitchain/actions/workflows/deploy.yml/badge.svg)](https://github.com/vardhan23v/chitchain/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

ChitChain is a trust-minimised chit fund on **MST Blockchain**. Members lock collateral and pay into a pot that lives inside a smart contract. Each round the contract runs a reverse auction, pays the winner, covers missed payments from the defaulter's collateral, and holds back part of early winners' payouts as security for their future dues. An AI risk engine prices each member's collateral (Low 0.5× · Medium 1× · High/Unassessed 2× by default) and an AI bidding agent bids for members based on a plain-language goal. Nobody, not the organiser and not the AI, ever holds the money.

**JOIN → CONTRIBUTE → BID → SETTLE → PROTECT**, every step a real MST testnet transaction.

## No real money
This is a **testnet-only prototype**. Every amount in the app is in **MST testnet coins**, which have no monetary value. There is no INR, USD, UPI, bank, card or payment gateway anywhere in the code. The UI shows an `MST TESTNET` badge wherever a balance appears.

## The problem
Informal chit circles run on trust in one organiser who holds the pot, keeps the ledger and decides what happens when someone misses a payment. Money goes missing, records are disputed, and defaulters are chased socially rather than by rule.

## Why a blockchain, and why the contract holds the pot
The pot, every member's collateral and the reserve sit **inside `ChitChain.sol`**, not in anyone's account. Contributions, the auction, payouts, dividends, holdbacks and default coverage are rules the contract enforces, so no organiser, backend or AI can move funds. The backend only *indexes* chain events for the UI and *triggers* settlement after deadlines; the database is never the source of truth for balances.

## Why MST
MST is an EVM-compatible chain with a public testnet, a faucet, a Blockscout explorer and the BridgeKey wallet, so the whole flow is verifiable by anyone with a browser. The hackathon track required it, and its fast blocks make 30-second demo rounds practical.

Built in 24 h for **MST Blockchain × NEWRRO Buildathon 2026 — MST Blockchain Track**.

## Live demo
- App: https://frontend-production-d322.up.railway.app
- Backend API: https://backend-production-64738.up.railway.app/health
- Demo video: `<link>`
- Hosting: frontend, backend and PostgreSQL all run on **Railway** (deployed with the Railway CLI, no GitHub integration).

## MST Blockchain integration
- Network: **MST Testnet** (chain ID `91562037`, RPC `https://testnetrpc.mstblockchain.com`)
- Contract: `ChitChain` v2 at `0xA18D48c29Bf68B750BB3fCb2f109661C5de1bD45` → https://testnet.mstscan.com/address/0xA18D48c29Bf68B750BB3fCb2f109661C5de1bD45 (deployed at block 5786000). v1 lived at `0xe53a0C78def8046ce1199D90EB8D2F81bb5A81d5`.
- What runs on-chain and why: custody of pot + collateral + reserve, contributions, discount auction, settlement, post-win holdback, default coverage, member removal, dividends, reputation counters. Everything that moves money is a contract rule, so it can be verified on MSTScan.
- Wallet: **BridgeKey** (EIP-1193, [Chrome Web Store](https://chromewebstore.google.com/detail/bridgekey/bfjojdcfenehemjgjlepdjomkpginlkg)) · SDK: ethers v6 (the library `@mstblockchain/mst-sdk` wraps) · Scaffold structure from MST VibeKit (Hardhat + Next.js)
- Faucet: https://faucet.masterstroke.academy (10 MST per address per 24 h)
- Verified facts: `eth_chainId` on the testnet RPC returns `0x5752035` = 91562037; explorer is Blockscout at `testnet.mstscan.com` with `/tx/<hash>` and `/address/<addr>`.

## Verifiable transactions
| Action | Tx |
|---|---|
| Deploy `ChitChain` v1 | [`0x2388ead3…092fc5`](https://testnet.mstscan.com/tx/0x2388ead3969d462c88f6dfd2f3cf59dfe5c0d161a2d17206a0428cd479092fc5) |
| `setRiskTier(D, High)` by the risk oracle | [`0xeb66b371…be5ccf`](https://testnet.mstscan.com/tx/0xeb66b371020a4085540cc4fc20774506843e38d413ed08bd9910dae8a3be5ccf) |
| `setRiskTier(A, Low)` | [`0x1e2806f4…2ad2be`](https://testnet.mstscan.com/tx/0x1e2806f48a8ec24923dd88f1e18e38461c08f1923191efbd8fa008566e2ad2be) |
| `createCircle` (5 members, 60 s rounds, 0.1 MST) | [`0x914db368…ea506f`](https://testnet.mstscan.com/tx/0x914db368d572dedee25ae5cd7f76faa457d7cfc68ff84ee28464c83e95ea506f) |
| Join — D (High tier, locks 2× = 0.20 MST) | [`0xc2dced24…6e26f3`](https://testnet.mstscan.com/tx/0xc2dced24c712387be668dd53357e31ace9f5d15cf02ec93dee6db8f82f6e26f3) |
| Join — A (Low tier, locks 0.5× = 0.05 MST) | [`0xa9761efc…14f0a4`](https://testnet.mstscan.com/tx/0xa9761efcc6bb4de383d7a05e0cec699c8c2c3caabccfc6f9bc21c4ae6214f0a4) |
| Agent bid for B ("I need money this month", 5 % of pot) | [`0xd73eef9b…781b6d`](https://testnet.mstscan.com/tx/0xd73eef9b8e109754a67b7a4c1cf5fa300578393f0952e816e7bc46f28f781b6d) |
| `settleRound` #1 — B wins, **D's missed payment covered from collateral**, holdback 0.20 applied, pot still 0.50 | [`0x05e3c2a1…635826`](https://testnet.mstscan.com/tx/0x05e3c2a1fa8ba24fd10f92fe60413129209ae53b3fb19b44ddb317426b635826) |
| Withdraw — B pulls 0.27 MST payout | [`0x59f853a5…4c9508`](https://testnet.mstscan.com/tx/0x59f853a5fc6a6417ff88ec9d75a9cf945f9fa22eb9d177429015cf25554c9508) |

Rows above are from the v1 contract's demo circle. The v2 rows (two-phase rounds, `DefaultDetected`) are added below after the v2 demo run. Every event in the live app links to the same explorer.

### v2 demo transactions (circle #2 on the v2 contract)
| Action | Tx |
|---|---|
| Deploy `ChitChain` v2 | [`0x2f2321f3…fe55e5`](https://testnet.mstscan.com/tx/0x2f2321f3b9e9f142de0c0c21f9e1f73607e12bc2a9c8b23ec186f0b80afe55e5) |
| `setRiskTier(D, HIGH)` — risk score 74 | [`0x524d1ca9…0f3a6b`](https://testnet.mstscan.com/tx/0x524d1ca9a5e92bded8de28db571755e666e55a916367c37e5ab82256860f3a6b) |
| `setRiskTier(A, LOW)` — risk score 13 | [`0x5a3972c9…e8da86`](https://testnet.mstscan.com/tx/0x5a3972c9ce9cab7a102bed50169389c65a4d10a4898544fac418c4cf85e8da86) |
| `createCircle` (5 members, 30 s contributions + 30 s bidding, 0.1 MST, 10 % holdback) | [`0x3fd50967…cc4405`](https://testnet.mstscan.com/tx/0x3fd5096720c05059ab614373786785104b099f118521e01764b039ca92cc4405) |
| Join — D (HIGH, locks 2× = 0.20 MST) | [`0x49f83c3e…59660d`](https://testnet.mstscan.com/tx/0x49f83c3e77c996e1661c85f8fb385afdd72938e2f5e6aa31215d4b0bef59660d) |
| Join — A (LOW, locks 0.5× = 0.05 MST) | [`0xe420c982…4024b4`](https://testnet.mstscan.com/tx/0xe420c982a3fa0d9e1cac366bd718597aa8e86646f6fba5e77db28230f44024b4) |
| Agent bid for B (goal "I need money this month", desired payout 0.45 → discount 0.05) | [`0xdacf5436…47b7bd`](https://testnet.mstscan.com/tx/0xdacf5436f6323523cea68bd95d5dbfb3b26ebb387b10581dae0d7761d647b7bd) |
| `settleRound` #1 — B wins 0.25 MST after 0.20 holdback; **`DefaultDetected(D)` covered 0.10 from collateral, shortfall 0**; dividends 0.0125 each | [`0x039b272b…f95766`](https://testnet.mstscan.com/tx/0x039b272b2dfb14d6a700cecf1c286aa2c84e0d87a0d5061cb4cea5b7acf95766) |
| `settleRound` #2 — A wins; D covered from collateral again (collateral now 0) | [`0x425ddc61…f5e539`](https://testnet.mstscan.com/tx/0x425ddc61d6dcf7dc48d925b616d534bd171c51cbd8c1cd67299f35f834f5e539) |
| `settleRound` #3 — **D partially covered**: 0.01 from reserve, shortfall 0.09, D removed; pot 0.41 (shown as "short by 0.09 MST") | [`0x550248b8…92ceaf`](https://testnet.mstscan.com/tx/0x550248b803a7c31fd49d613e83ff7c27c66a274e6435d1680da433173092ceaf) |

Rounds 1–2 show the full-cover case (pot fully funded); round 3 shows the honest partial-cover case once D's collateral was exhausted.

## How it works

### Circle configuration
A creator sets: contribution per round, members (3–20), contribution window, bidding window, join window, platform fee (≤ 3 %), base collateral (≥ contribution), holdback %, max discount (≤ 50 %), and the collateral multipliers for Low / Medium / High risk. Nothing is hard-coded per circle.

### Collateral (JOIN)
Required collateral = `baseCollateral × multiplier(tier)`; defaults 0.5× / 1× / 2×. An **Unassessed** wallet pays the High multiplier, so a fresh Sybil wallet never gets a discount. The tier is snapshotted at join; later oracle updates do not change a running circle.

### Contributions (CONTRIBUTE)
Every active member pays exactly `contribution` once per round, before the contribution deadline. Status per member: `PAID`, `PENDING`, `COVERED_BY_COLLATERAL`, `PARTIALLY_COVERED`, `DEFAULTED`.

### Defaults (PROTECT) — the critical rule
When the round is settled, the contract itself checks who has not paid:
```
required = contribution
if collateral ≥ required:    collateral −= required; pot += required        → DefaultDetected(shortfall = 0)
else:                        fromCollateral = collateral; fromReserve = min(gap, reserve)
                             shortfall = required − fromCollateral − fromReserve
                             member removed                                   → DefaultDetected(shortfall) + Removed
```
The keeper only calls `settleRound`; the deduction is contract logic and produces one on-chain event with `required`, `fromCollateral`, `fromReserve` and `shortfall`. The UI says "Pot fully funded" **only** when `shortfall == 0`; a partial cover is shown as "Pot short by X MST". Nothing is ever minted to hide a gap.

### Bidding (BID)
A reverse auction: members state the payout they would accept from the pot; the contract stores it as a discount (`pot − accepted`). The lowest accepted payout (highest discount) wins; equal bids lose to the earlier one; the discount is capped by `maxDiscountBps`.

### Settlement (SETTLE)
`payout = pot − fee − discount`, then the holdback below is applied and the rest is credited to the winner's claimable balance. Anyone can settle after the bidding deadline; the backend keeper does it automatically within a few seconds.

### Dividends
```
dividendsTotal   = discount
dividendPerMember = discount ÷ (active members − winner)     dust → first eligible member in join order
```
Both numbers are shown in the Round History table and in every `DividendCredited` feed item.

### Early-winner holdback
```
tierGap  = max(0, remainingDues × coverage(tier) − collateral)     coverage: Low 50 % · Medium 75 % · High 100 %
flatHold = payout × holdbackBps / 10000                            per-circle, default 10 %
holdback = min(payout, max(tierGap, flatHold))
```
The held amount stays in the winner's collateral and covers their future contributions; it is released with the collateral at completion. A High-risk winner is always fully secured.

### Withdrawals
Only the `claimable` balance (payouts, dividends, refunds, released collateral) can be withdrawn, by the member, via pull payment. Locked collateral, holdback and the reserve can never be withdrawn while a circle is active.

### AI risk engine (demo heuristic)
Inputs: on-time rate, missed payments, circles completed, removals, plus labelled synthetic history for the five demo wallets. Score 0 = safest … 100 = riskiest:
```
riskScore = clamp(60 − 40·onTimeRate − 10·min(completed,3)/3 + 30·(removed > 0), 0, 100)
LOW ≤ 39 · MEDIUM 40–69 · HIGH ≥ 70 · cold start = 40 (MEDIUM)
```
The LLM only writes a two-sentence explanation from those factors (template fallback if offline). The tier is written on-chain by the risk-oracle wallet with `setRiskTier`, and the contract, not the frontend, enforces the collateral.

### AI bidding agent (experimental)
A member gives a goal ("I need about 0.45 MST this round"), optional desired payout, max discount, urgency and risk tolerance. Each round the agent reads the live pot, lowest accepted payout, time left and rounds left, asks the LLM for `{bidThisRound, discountPct, reason}`, then applies deterministic guardrails (eligibility, cap, must beat the best bid, member's limits) and a `staticCall` preflight before sending `placeBid` from the member's **custodial demo wallet**. Every decision, including skips, is logged with reason, round, timestamp, wallet and tx hash. It does not guarantee optimal outcomes.

### Keeper
Every 3 s the backend checks each active circle; when the bidding deadline has passed it calls `settleRound`. It can trigger, never decide.

## Roles and Responsibilities

> "ChitChain operates the platform. The organizer manages the circle. Members participate in the circle. The smart contract controls the financial rules and funds."

| Role | Description | Can | Cannot |
|---|---|---|---|
| **MEMBER** | Participates in a chit circle | connect wallet, sign in, join, lock collateral, contribute, bid, withdraw *claimable* balances, view everything about their own position, ask the AI agent (demo wallets) | change rules, withdraw the pot, change anyone's risk, touch another member's collateral, pick a winner, bypass deadlines or default rules |
| **CIRCLE ORGANIZER** | Creates and manages a circle but does not personally hold the pot | create a circle from their own wallet, name it, invite members, monitor contributions, defaults, bidding and settlement, view analytics and history | transfer the pot, mark someone as paid, deduct collateral, change balances, choose a winner, withdraw another member's funds |
| **PLATFORM ADMIN** | Operates the ChitChain website and infrastructure | view all circles, users, activity, keeper/indexer health, audit log, support tickets, safe config; suspend website access; run demo controls (custodial demo wallets only) | withdraw or move any member funds, edit blockchain balances. There is no "withdraw all" anywhere. |
| **SMART CONTRACT** | Controls the financial rules | hold the pot, collateral and reserve; enforce contributions, the auction, settlement, payouts, dividends, default deduction and holdback | be overridden by the backend, organizer or admin |

### Smart contract permissions (why each role is allowed what)
The deployed contract (`ChitChain` v2) has **no privileged fund functions**. Concretely:
- `createCircle` is permissionless; the caller is stored as `creator` and gets no on-chain power over funds. The Organizer role therefore lives in the website database and only gates *website* screens (naming, invites, analytics).
- `settleRound`, which performs the default deduction, is callable by anyone after the bidding deadline. The keeper calls it for convenience; the deduction logic is the contract's.
- `setRiskTier` is the only privileged call (the risk-oracle wallet), and it affects only *future* joins; a circle snapshots each member's tier at join.
- `withdraw` pays only the caller's own `claimable` balance. Locked collateral, holdback and the reserve are never withdrawable while a circle is active.
- `withdrawTreasury` pays accumulated fees to the treasury address set at deploy time, never member funds.
- `receive()`/`fallback()` revert, so the contract cannot be used as a wallet by anyone.
Because of this, adding Organizer/Admin roles required **no contract change**: the website cannot give itself powers the contract does not expose.

### How login works
1. Connect BridgeKey (EIP-1193). The app only ever sees your public address.
2. The backend issues a one-time nonce (valid 5 minutes) and a plain-text sign-in message that includes the domain, your address, chain id 91562037, the nonce and timestamps.
3. You sign that message with `personal_sign`. Signing is free and moves no funds.
4. The backend rebuilds the message from its own stored nonce, verifies the signature with `ethers.verifyMessage`, marks the nonce used, and issues a 24-hour session token (HS256 JWT sent as a bearer header). Nonces cannot be replayed; sessions can be revoked by logging out or by an admin suspension; the role is re-read from the database on every request.
5. You are redirected by role: MEMBER → `/dashboard`, ORGANIZER → `/organizer`, ADMIN → `/admin`.
No passwords, no seed phrases, no private keys: ChitChain never asks for them and never stores them.

### Who operates ChitChain
The ChitChain platform team runs the website, backend API, database, AI services, keeper and monitoring. Website administrators can see everything and support users, but cannot change blockchain financial state.

### Who controls funds
The `ChitChain` smart contract on MST testnet holds every MST in every circle and moves it only through its coded rules: contribution → contract; default → member collateral → pot/reserve; payout → winner's claimable balance; dividend → eligible members' claimable balances. The backend and database only index and cache what the chain already says.

### Future compliance note
There is no broker role. A real-world deployment would require registered chit operators and regulatory compliance (Chit Funds Act, 1982); the MVP does not claim to provide that.

## Architecture
![architecture](architecture.png)

See [ARCHITECTURE.md](ARCHITECTURE.md) (behaviour), [INTERFACE.md](INTERFACE.md) (contract ABI), [DESIGN.md](DESIGN.md) (UI) and [API.md](API.md) (REST).

```
                  CHITCHAIN PLATFORM (website team)
                         |
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
    Frontend          Backend            AI
  (login, UI)   (sessions, API, index,  (risk, bids)
                 keeper, audit, support)
        └────────────────┼────────────────┘
                         ↓
  Members ─ Organizers ─►  MST Blockchain (BridgeKey signs every tx)
                         ↓
                  ChitChain contract
                         ↓
             Pot / Collateral / Rules
```

**Separation of duties:** the blockchain is custody + rules; the AI is judgement. The AI's only privileged on-chain power is `setRiskTier` (risk oracle wallet). The bidding agent bids from **custodial demo wallets** that are labelled as such in the UI.

## Repo layout
```
contracts/    ChitChain.sol · ChitChainBase.sol · IChitChain.sol · test/ReentrantAttacker.sol
test/         ChitChain.test.ts (12 cases from ARCHITECTURE §3.7 + INTERFACE §7 invariants)
scripts/      ping · deploy · export-abi · seed-demo
deployments/  mstTestnet.json (address, deploy tx, block)
backend/      Express + Prisma/PostgreSQL: indexer, keeper, risk engine, bidding agent, demo autopilot
frontend/     Next.js 14 + Tailwind + shadcn/ui
```

## Data architecture (Prisma + PostgreSQL)

The chain is the source of truth for money; PostgreSQL is a **read model plus agent memory**. Nothing in the database can move funds. The backend talks to Postgres only through Prisma (`backend/prisma/schema.prisma`, client in `backend/src/db/`).

```
MST Testnet ──events──► indexer ──createMany(skipDuplicates)──► events
                                                                  ▲
frontend /feed, /circles/:id, /members/:addr/risk  ◄── Prisma ────┤
                                                                  │
keeper ── settleRound ──► chain          agent ── placeBid ──► chain ──► agent_logs
```

| Model | Table | Purpose | Key |
|---|---|---|---|
| `Event` | `events` | every contract event, decoded args as JSON, tx hash + block + timestamp | `@@unique(txHash, logIndex)` makes re-indexing idempotent |
| `AgentLog` | `agent_logs` | each bidding-agent decision (bid or skip), reason, source (llm/fallback), tx hash | indexed by circle |
| `Mandate` | `mandates` | a member's plain-language goal for the agent, optional max discount | `@@id(circleId, member)` |
| `RiskCache` | `risk_cache` | cached risk result JSON per address (30 s TTL) | address |
| `DemoSkip` | `demo_skip` | demo console "skip payment" toggle per wallet | address |
| `DemoCircle` | `demo_circles` | circles the demo autopilot manages | circleId |
| `Meta` | `meta` | key/value, e.g. `last_block` for the indexer cursor | key |

Design choices:
- **Idempotent ingestion.** The indexer polls `queryFilter` from `last_block + 1` in ≤ 2,000-block chunks and inserts with `createMany({ skipDuplicates: true })` in one transaction, so restarts never duplicate feed items.
- **Schema as code.** Tables are created from the Prisma schema at boot (`prisma db push` in `npm start`), so a fresh Railway Postgres works with zero manual steps. Migrations (`prisma migrate`) are the next step once the schema stabilises.
- **Rebuildable.** Drop the database and the feed rebuilds from `START_BLOCK`. Only agent mandates and logs are backend-native state.
- **Wei stays a string.** Amounts are stored as decimal strings and converted to `bigint` at the code edge, never as floats.

Local development:
```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/chitchain
cd backend && npm run prisma:push && npm run db:smoke   # expect OK
```

## Run locally

Prerequisites: Node 20+, npm, a BridgeKey (or any EIP-1193) wallet with test MST from `https://faucet.masterstroke.academy`.

```bash
npm install && (cd backend && npm install) && (cd frontend && npm install)
cp .env.example .env        # fill the keys (see below)
npx hardhat test            # contract tests
npm run ping                # prints chain id + balances on MST testnet
npm run deploy              # deploys, writes deployments/mstTestnet.json
npm run export-abi          # copies ABI into backend/ and frontend/
(cd backend && npm run prisma:push && npm run dev) # http://localhost:4000 (needs DATABASE_URL)
(cd frontend && npm run dev)# http://localhost:3000
```

Env vars (`.env` at the repo root; never committed):

| Var | Purpose |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | deploys the contract, funds demo wallets |
| `KEEPER_PRIVATE_KEY` | calls `settleRound` after each deadline |
| `RISK_ORACLE_PRIVATE_KEY` | calls `setRiskTier` (constructor `riskOracle`) |
| `AGENT_WALLET_KEYS` | 5 comma-separated keys for custodial demo members A–E |
| `TREASURY_ADDRESS` | receives leftover reserve at circle completion |
| `CHITCHAIN_ADDRESS`, `START_BLOCK` | from `deployments/mstTestnet.json` |
| `DATABASE_URL` | PostgreSQL connection string (Railway injects `${{Postgres.DATABASE_URL}}`) |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | any OpenAI-compatible chat API; blank → template fallback |
| `NEXT_PUBLIC_*` | frontend: contract address, chain id 91562037, RPC, API URL, explorer |

Demo flow: open `/demo` → **Fund wallets** → **Assess all** (D becomes High, A Low) → **New demo circle (30 s rounds)** → open the room → ask the agent for B "I need money this month" → toggle **skip** on D → watch the keeper settle, D's collateral cover the miss, and the pot stay full.

## CI/CD
- **CI** (`.github/workflows/ci.yml`) on every push and pull request: Hardhat compile + 29 contract tests + ABI-sync check; backend Prisma validate, typecheck and unit tests; frontend typecheck, lint, build and a guard that no `MSTC`/fiat symbols remain.
- **CD** (`.github/workflows/deploy.yml`): uploads `backend/` then `frontend/` to Railway with the Railway CLI and smoke-checks `/health`. Currently **manual** (Actions → Deploy to Railway → Run workflow) and needs the repository secret `RAILWAY_TOKEN` (Railway → project → Settings → Tokens, which requires a verified Railway account). Until then deploys are done with `railway up` from a developer machine.

## Wallet setup
1. Install BridgeKey from the Chrome Web Store link above and create a wallet.
2. Switch it to **MST Testnet** (the app offers to add the network: chain id 91562037, RPC `https://testnetrpc.mstblockchain.com`, explorer `https://testnet.mstscan.com`).
3. Claim 10 MST at the faucet for your address.
4. Open the app, click **Connect**, approve in BridgeKey. The network pill turns green.

## Running tests
```bash
npx hardhat test                 # 29 contract cases incl. balance invariant after every step
(cd backend && npm test)         # risk score + agent guardrails unit tests
```
Contract cases cover: creation and parameter validation, joining, Low/Medium/High/Unassessed and custom collateral multipliers, correct / wrong / duplicate contributions, valid / too-high / not-higher / non-member / after-deadline bids, winner selection, payout, discount, dividends and dust, default detection with full, partial and reserve-assisted coverage, double-default prevention, holdback (tier floor, flat %, release), withdrawal restrictions, unauthorised oracle/treasury calls, re-entrancy, settlement timing and multi-round completion.

## Running the demo
Open `/demo` (or use the API):
1. **Fund wallets** · 2. **Assess all** (A LOW, B MEDIUM, C LOW, D HIGH, E MEDIUM, each a `setRiskTier` tx) · 3. **New demo circle** (5 members, 30 s contributions + 30 s bidding, 0.1 MST, 10 % holdback) — the five custodial demo wallets join with 0.05 / 0.1 / 0.05 / 0.2 / 0.1 MST collateral.
4. In the room, ask the agent for B: "I need money this month". Its bid appears in the feed with a reason.
5. Toggle **skip** on D. At the next settlement the contract emits `DefaultDetected` for D: 0.1 MST taken from D's collateral, pot still full. The Default event card shows required / used / remaining / status and links to MSTScan.
6. Open **Round history** for pot, payout, discount, dividends per member and holdback of every settled round.

## MSTScan verification
Every action in the UI links to `https://testnet.mstscan.com/tx/<hash>`. Open the contract page, tab **Logs**, to see `DefaultDetected`, `HoldbackApplied`, `RoundSettled` and `DividendCredited` with their decoded arguments. Only hashes returned by the MST network are ever displayed.

## Honest limits
- Testnet prototype; MST testnet coins are used only for demonstration and have no monetary value. No real money is involved.
- Risk score is a **demo heuristic** on synthetic demo history, not a credit bureau score.
- AI bidding is experimental and does not guarantee optimal or profitable decisions.
- Keeper, risk oracle and **agent wallets are custodial/centralised** in the MVP (backend holds keys). Production: multisig oracle, session keys for the agent.
- Bids are public → last-second sniping possible. Production: commit–reveal.
- Low/Medium early winners are only partially secured (50 % / 75 % of remaining dues); the gap is backed by the circle reserve (fees + forfeits) up to its balance.
- Removed members forfeit collateral and past contributions to the pool (MVP rule; production refunds minus penalty at the end).
- MST is volatile → production needs a rupee-pegged asset.
- Contract is tested but **unaudited**. Testnet only. Not "fully decentralised": keeper, oracle and agent are backend wallets.
- A real deployment would need legal and regulatory compliance; ChitChain is not an unregistered real-world chit fund operator.

## Legal
Prototype on testnet. Chit funds are regulated under the Chit Funds Act, 1982; ChitChain is infrastructure for registered organisers and informal friend circles, not an unregistered chit company.

## About

Built by **Vallur Sree Vardhan** ([@vardhan23v](https://github.com/vardhan23v)) for the MST Blockchain × NEWRRO Buildathon 2026, MST Blockchain Track.

- Live app: https://frontend-production-d322.up.railway.app
- Source: https://github.com/vardhan23v/chitchain
- Specs: [ARCHITECTURE.md](ARCHITECTURE.md) · [INTERFACE.md](INTERFACE.md) · [DESIGN.md](DESIGN.md) · [API.md](API.md)
