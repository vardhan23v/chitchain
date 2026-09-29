# ChitChain — the pot sits in a contract, not in anyone's account

<p align="center">
  <a href="https://frontend-production-d322.up.railway.app"><img alt="Live app" src="https://img.shields.io/badge/live%20app-Railway-7C3AED?logo=railway&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="https://backend-production-64738.up.railway.app/health"><img alt="Backend" src="https://img.shields.io/badge/backend-health-16A34A?logo=express&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="https://ai-agent-production-fef8.up.railway.app/health"><img alt="AI agent" src="https://img.shields.io/badge/AI%20agent-health-8B7CF6?logo=fastapi&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="https://railway.app"><img alt="Hosted on Railway" src="https://img.shields.io/badge/hosted%20on-Railway-0B0D0E?logo=railway&amp;logoColor=white&amp;style=for-the-badge"></a>
</p>
<p align="center">
  <a href="https://testnet.mstscan.com"><img alt="MST Testnet" src="https://img.shields.io/badge/MST%20Testnet-chain%2091562037-C0392B?style=for-the-badge"></a>
  <a href="https://testnet.mstscan.com/address/0x4096bDd55345CD98b4168d70A8595E544eEDCBFd"><img alt="Contract" src="https://img.shields.io/badge/contract-v2.2%200x4096…CBFd-C0392B?logo=ethereum&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="contracts/ChitChain.sol"><img alt="Solidity" src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="https://chromewebstore.google.com/detail/bridgekey/bfjojdcfenehemjgjlepdjomkpginlkg"><img alt="Wallet" src="https://img.shields.io/badge/wallet-BridgeKey-7C3AED?style=for-the-badge"></a>
  <a href="#no-real-money"><img alt="No real money" src="https://img.shields.io/badge/money-MST%20TESTNET%20only-D97706?style=for-the-badge"></a>
</p>
<p align="center">
  <a href="test"><img alt="Hardhat tests" src="https://img.shields.io/badge/Hardhat%20tests-49%20passing-F7DF1E?logo=ethereum&amp;logoColor=black&amp;style=for-the-badge"></a>
  <a href="backend"><img alt="Backend tests" src="https://img.shields.io/badge/backend%20tests-68%20passing-16A34A?logo=node.js&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge"></a>
</p>
<p align="center">
  <a href="frontend"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="backend"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="frontend/tailwind.config.ts"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="frontend/components/motion"><img alt="Framer Motion" src="https://img.shields.io/badge/Framer%20Motion-11-0055FF?logo=framer&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="frontend/lib"><img alt="ethers" src="https://img.shields.io/badge/ethers-v6-2535A0?style=for-the-badge"></a>
  <a href="DESIGN.md"><img alt="Theme" src="https://img.shields.io/badge/theme-dark%20midnight%20%2B%20MST%20red-D7263D?style=for-the-badge"></a>
</p>
<p align="center">
  <a href="backend/src"><img alt="Express" src="https://img.shields.io/badge/Express-API-000000?logo=express&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="backend/prisma/schema.prisma"><img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="backend/prisma/schema.prisma"><img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Railway-4169E1?logo=postgresql&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="agent"><img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="agent/main.py"><img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-agent%20service-009688?logo=fastapi&amp;logoColor=white&amp;style=for-the-badge"></a>
  <a href="agent"><img alt="CrewAI" src="https://img.shields.io/badge/CrewAI-bidding%20crew-FF5A50?style=for-the-badge"></a>
  <a href="agent"><img alt="Groq" src="https://img.shields.io/badge/LLM-Groq%20qwen3-F55036?style=for-the-badge"></a>
</p>

ChitChain is a trust-minimised chit fund on **MST Blockchain**. Members lock collateral and pay into a pot that lives inside a smart contract. Each round everyone contributes, the contract covers missed payments from the defaulter's collateral, and the round's recipient gets the first choice: take the full pot, or decline so the others can bid in a reverse auction where the lowest payout offer wins and the difference is shared as dividends. Part of early winners' payouts is held back as security for their future dues. An AI risk engine prices each member's collateral (Low 0.5× · Medium 1× · High/Unassessed 2× by default) and an AI bidding agent bids for members based on a plain-language goal. Nobody, not the organiser and not the AI, ever holds the money.

**JOIN → CONTRIBUTE → POT READY → ACCEPT the full pot, or DECLINE → AUCTION → SETTLE → DIVIDENDS**, with collateral covering any missed payment. Every step is a real MST testnet transaction.

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
- Hosting: frontend, backend, the CrewAI `ai-agent` service and PostgreSQL all run on **Railway** (deployed with the Railway CLI, no GitHub integration).

## MST Blockchain integration
- Network: **MST Testnet** (chain ID `91562037`, RPC `https://testnetrpc.mstblockchain.com`)
- Contract: `ChitChain` **v2.2** at `0x4096bDd55345CD98b4168d70A8595E544eEDCBFd` → https://testnet.mstscan.com/address/0x4096bDd55345CD98b4168d70A8595E544eEDCBFd (deployed at block 5802569, tx [`0x9fa621a4…b2ce0d`](https://testnet.mstscan.com/tx/0x9fa621a4a22f283f93eb62acfd1b441e5f39eee61b3f08b53e50354e20b2ce0d)). v2.2 adds the recipient decision: the auction only exists after the round's recipient declines the full pot. Earlier contracts stay verifiable: v2.1 `0xFBA432E34E70d6069677d80944A9eEf83376CA98`, v2 `0xA18D48c29Bf68B750BB3fCb2f109661C5de1bD45` (the older tables below), v1 `0xe53a0C78def8046ce1199D90EB8D2F81bb5A81d5`.
- What runs on-chain and why: custody of pot + collateral + reserve, contributions, the recipient's accept or decline, the payout-offer auction, settlement, post-win holdback, default coverage, member removal, dividends, reputation counters. Everything that moves money is a contract rule, so it can be verified on MSTScan.
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

### v2.2 demo transactions (circle #2 on v2.2, 0.02 MST per member, 0.1 MST pot)
The brief's five-round story at testnet scale (500 → 0.1 MST, so the offers 480 / 470 / 460 / 450 become 0.096 / 0.094 / 0.092 / 0.090):

| Step | Tx |
|---|---|
| `createCircle` (5 custodial demo wallets, 30 s windows) | [`0xe4045bc0…dde091`](https://testnet.mstscan.com/tx/0xe4045bc0257b27b31746c6ed67fd54d3d7594f5bce007e19f554f819b7dde091) |
| Round 1: `PotReady` 0.1 MST, recipient A | [`0x535a867f…6ac050`](https://testnet.mstscan.com/tx/0x535a867f973490ba6d7a7d8a09554c2c642fc740e19e0c630f208793b66ac050) |
| Round 1: **A accepts the full pot** (`FullPotAccepted` + `RoundSettled`, no auction) | [`0x1448d8fe…e4617d`](https://testnet.mstscan.com/tx/0x1448d8feb40e83c969a0dfd1d0dbac5287d6fa976dfac9df2ad5848a52e4617d) |
| Round 2: `PotReady`, recipient B | [`0x1bd3917e…3bdef8`](https://testnet.mstscan.com/tx/0x1bd3917ecc3a83c566081fb42128a387d6db14af38fde41c315482e4fc3bdef8) |
| Round 2: **B declines**, the auction opens on-chain (`FullPotDeclined`) | [`0x429e904f…d481e8`](https://testnet.mstscan.com/tx/0x429e904faa26cd77e96fff26021d0c52026090d471577f3e75322d4839d481e8) |
| Round 2 offers: B 0.096 · C 0.094 · E 0.092 · D 0.090 | [`0x6577b330…3949c4`](https://testnet.mstscan.com/tx/0x6577b330e1086be86e546c242ecc8f3c8475c62c4240d6fbff44255bcc3949c4) · [`0x0e6e42f0…84eb29`](https://testnet.mstscan.com/tx/0x0e6e42f0e565b9d2b02988dc54fed85d254f21cdd0339d2ea580486a5984eb29) · [`0x0be861ce…22b7df`](https://testnet.mstscan.com/tx/0x0be861ced1f36b773645b77e53e2d230b21ac3d0b378b6f63d7d90bc3022b7df) · [`0x00df59d7…ee54e5`](https://testnet.mstscan.com/tx/0x00df59d7e24407b01cff29ad526102cd79ff046b6463ea05db22a0f5a5ee54e5) |
| Round 2 settled: **D wins at 0.090**; the 0.010 discount is split 0.0025 to A, B, C and E | [`0xf8fec637…db0a2f`](https://testnet.mstscan.com/tx/0xf8fec63734eed1a597d80453c18b1d1e72773d420d8106c5630bbc70eadb0a2f) |
| Round 3: **C accepts** the full pot | [`0x5b8703c0…68248e`](https://testnet.mstscan.com/tx/0x5b8703c0a00aac393bd757d16ab36403dfa8b45ad6cb5786b15c34ef3368248e) |
| Round 4: **D misses; default protection covers 0.02 from D's collateral**, pot stays 0.1; recipient E | [`0x0e483fde…52f50a`](https://testnet.mstscan.com/tx/0x0e483fde67a01f07cfb90f79b1b3b659c2002ca13465cfb316bc46909952f50a) |
| Round 4: **E accepts** | [`0x1fb9fa9e…d01c2d`](https://testnet.mstscan.com/tx/0x1fb9fa9ebf198e56239b0161ff863731da9d7c5e905b472f1747ec86d6d01c2d) |
| Round 5: B accepts; `CircleCompleted` | [`0x73650414…e3a859`](https://testnet.mstscan.com/tx/0x73650414fec322367bb1f908cedcab21e44901619002d9b32d0a127e00e3a859) |

Circle #1 on v2.2 shows the insufficient-collateral path: E started with too little test MST, its collateral covered two misses and it was removed in round 3 with a real shortfall ([`0x8d458594…e39395`](https://testnet.mstscan.com/tx/0x8d458594ecaf50bc6c632afdcb01ce33d33b89bd62abfe52cfcdd7ec71e39395)).

Rows above the v2.2 table are from the v1 contract's demo circle. The v2 rows (two-phase rounds, `DefaultDetected`) are added below after the v2 demo run. Every event in the live app links to the same explorer.

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
A creator sets: contribution per round, members (2–20), contribution window, decision and auction window (the same length is used for the recipient's decision and, after a decline, for the auction), join window, platform fee (≤ 3 %), base collateral (≥ contribution), holdback %, max discount (≤ 50 %), and the collateral multipliers for Low / Medium / High risk. Nothing is hard-coded per circle.

### Collateral (JOIN)
Required collateral = `baseCollateral × multiplier(tier)`; defaults 0.5× / 1× / 2×. An **Unassessed** wallet pays the High multiplier, so a fresh Sybil wallet never gets a discount. The tier is snapshotted at join; later oracle updates do not change a running circle.

### Contributions (CONTRIBUTE)
Every active member pays exactly `contribution` once per round, before the contribution deadline. The payment that completes the pot closes the contribution phase at once; otherwise anyone (normally the keeper) calls `closeContributions` after the deadline, which covers every miss (below) and makes the pot ready. Status per member: `PAID`, `PENDING`, `COVERED_BY_COLLATERAL`, `PARTIALLY_COVERED`, `DEFAULTED`.

### Defaults (PROTECT) — the critical rule
When contributions close, the contract itself checks who has not paid:
```
required = contribution
if collateral ≥ required:    collateral −= required; pot += required        → DefaultDetected(shortfall = 0)
else:                        fromCollateral = collateral; fromReserve = min(gap, reserve)
                             shortfall = required − fromCollateral − fromReserve
                             member removed                                   → DefaultDetected(shortfall) + Removed
```
The keeper only calls `closeContributions`; the deduction is contract logic and produces one on-chain event with `required`, `fromCollateral`, `fromReserve` and `shortfall`. The UI says "Pot fully funded" **only** when `shortfall == 0`; a partial cover is shown as "Pot short by X MST". Nothing is ever minted to hide a gap.

### Recipient decision (FIRST CHOICE)
When the pot is ready (`PotReady`), the contract names the round's **recipient**: starting at position `(round − 1) mod n` in join order, the first member who has not received a pot and is not removed (round 1 → A, round 2 → B, and members who already won are skipped). Only the recipient can call:
- `acceptFullPot` — the round settles immediately with the recipient as winner and discount 0. **No auction is created.**
- `declineFullPot` — the phase changes to `Auction` on-chain and the auction window starts.

The recipient cannot accept after declining or decline after accepting (`WrongPhase`), and nobody else can decide (`NotRecipient`). If the decision window passes with no choice, anyone can settle and the recipient receives the full pot (outcome `DECISION_TIMEOUT`).

### Auction (BID) — only after a decline
Members who have not received a pot make a **payout offer**: how much of the pot they will accept. The contract stores it as a discount (`pot − offer`). The lowest payout offer (highest discount) wins; an offer must be lower than the current lowest; the discount is capped by `maxDiscountBps` of the assembled pot. `placeBid` reverts with `WrongPhase` while contributing or deciding, and with `BiddingClosed` after the window. If the auction closes with no offers, the recipient receives the full pot (outcome `NO_BIDS`).

### Settlement (SETTLE)
`payout = pot − fee − discount` (discount 0 when the full pot is accepted), then the holdback below is applied and the rest is credited to the winner's claimable balance. `settleRound` is permissionless once the decision or auction window has passed; the keeper does it within a few seconds. Each round's record (`getRoundHistory`) stores the recipient and the outcome: `ACCEPTED`, `AUCTION`, `DECISION_TIMEOUT`, `NO_BIDS` or `NO_RECIPIENT` (nobody eligible left, the pot minus fee is shared as dividends).

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
A member gives a goal ("I need about 0.45 MST this round"), optional desired payout, max discount, urgency and risk tolerance. The agent never opens an auction and never decides for the recipient: it waits through contributions and the recipient's decision, and acts only once the recipient has declined and the auction is open on-chain. Then it reads the live pot, lowest accepted payout, time left and rounds left, asks the LLM for `{bidThisRound, discountPct, reason}`, then applies deterministic guardrails (eligibility, cap, must beat the best bid, member's limits) and a `staticCall` preflight before sending `placeBid` from the member's **custodial demo wallet**. Every decision, including skips, is logged with reason, round, timestamp, wallet and tx hash. It does not guarantee optimal outcomes.

### Keeper
Every 3 s the backend checks each active circle and triggers only the permissionless step whose deadline passed: `closeContributions` after the contribution deadline, `settleRound` after the decision or auction window. It can trigger, never decide: it never accepts, declines or bids for anyone.

### Usernames
After a wallet signs in for the first time it is asked for a username (3 to 20 characters, letters, numbers and single underscores, starting with a letter, stored in lowercase). Names are unique, reserved words and platform prefixes (admin, support, demo, mst, chitchain…) are refused, anything that looks like an address is refused, and lookalikes such as `rahul` and `rahu1` count as the same name. The username is an off-chain display name mapped to the wallet; the wallet address stays the on-chain identity and is shown next to the name everywhere. The profile page shows username, wallet, risk tier, circles, completed rounds, contributions, defaults, payouts and dividends, all read from the contract or its indexed events.

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

Admin fallback: the platform administrator can optionally sign in with a username + password (`ADMIN_LOGIN_USER` / `ADMIN_LOGIN_PASSWORD_HASH`, hash generated with `npm run hash-password`) when their wallet is unavailable; the link appears on `/login` only when the backend has it enabled.
That password session is an `admin:<username>` account with no wallet: it grants website admin rights only (users, support, audit, config) and can never sign transactions or control wallets or funds. Members and organizers always sign in with their MST wallet.

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

## Interface

Dark midnight theme with the MST red accent ([DESIGN.md §14](DESIGN.md)): a 240 px sidebar (icon rail below 1280 px, bottom tabs on phones), a sticky header with the network pill, notifications and wallet menu, and an overview-first layout. Red marks the primary action, the active nav item and chain references; money in the contract is sky, the AI agent is violet. Every amount is MST and labelled testnet, every number is read from the contract or the indexer, and anything unavailable says so instead of showing a placeholder.

| Page | What it shows |
|---|---|
| `/` | Hero with the signature money-flow visualisation, network stats, a live ticker of the newest on-chain events, the latest circle, a scroll-driven "How it works" (the pot illustration plays one round as you scroll), why blockchain, transparency, roles and the circles grid |
| `/dashboard` | Greeting, the one next action for your active chit (pay the contribution, accept or decline your pot, place a bid, or wait for settlement), stat cards, the active chit card, the recipient decision or live auction, money flow, AI risk card and recent transactions |
| `/circle/:id` | Round timeline (contributions, pot ready, recipient decision, auction only if declined, settlement, dividends) with how the last round ended, pot meter, the recipient decision card (accept the full pot or decline and open an auction, with fee and holdback preview), the auction card with pot, current lowest payout and current discount and the "Place a bid" payout-offer dialog, AI bidding agent panel, members with usernames, round history with outcomes, defaults and the live feed |
| `/activity` | Transaction centre with type tabs and the 5-step transaction state machine (Preparing, Wallet confirmation, Submitted, Confirming on MST, Confirmed) |
| `/create`, `/member/:addr`, `/collateral`, `/support` | Two-column create form with live summary; profile with username, stats, the risk card and on-chain history (and username settings for your own wallet); per-circle collateral; help centre and tickets |
| `/organizer`, `/organizer/circles/:id`, `/admin`, `/demo` | Organizer dashboard (recipient, decision, auction status, lowest payout, discount, defaults, collateral per circle) and per-circle analytics with the round timeline; platform admin (users, audit log, support, config, system health, treasury); demo controls for the custodial wallets |

**Motion.** Twelve scroll-driven and ambient effects ([DESIGN.md §15](DESIGN.md)): reading-progress bar, headline word reveal, hero parallax, pointer-following glow, live ticker, pinned scrollytelling "How it works", self-tracing money-flow connector, self-drawing history rail, spotlight card borders, magnetic buttons, rolling countdown digits and the spinning hero ring. Everything is transforms and opacity, and every effect has a static fallback. An **Animations** switch in the footer and sidebar cycles System, On, Off per browser: System follows the OS reduce-motion setting, the choice is stored in `localStorage` and mirrored on `<html data-motion>` before the first paint. Layout is checked at desktop and phone widths for horizontal overflow, clipped text and console errors.

## Repo layout
```
contracts/    ChitChain.sol · ChitChainBase.sol · IChitChain.sol · test/ReentrantAttacker.sol
test/         ChitChain.test.ts (12 cases from ARCHITECTURE §3.7 + INTERFACE §7 invariants)
scripts/      ping · deploy · export-abi · seed-demo
deployments/  mstTestnet.json (address, deploy tx, block)
backend/      Express + Prisma/PostgreSQL: indexer, keeper, risk engine, bidding agent, demo autopilot
agent/        Python 3.12 + CrewAI + FastAPI: AI bidding crew (decides only; Node guards and executes)
frontend/     Next.js 14 + Tailwind + shadcn/ui + framer-motion (motion primitives in components/motion/)
CLAUDE.md     working rules for AI-assisted edits: folder map, house style, commands, deploy
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
| `BidAgent` | `bid_agents` | v4 autonomous bidding strategy per circle + custodial wallet: limits, permission, status, last decision / bid / tx | indexed by circle + status |
| `AgentEvent` | `agent_events` | v4 activity lines of a BidAgent (kind, text, user-facing reason, JSON data), streamed over SSE | indexed by agent + id, cascade delete |
| `RiskCache` | `risk_cache` | cached risk result JSON per address (30 s TTL) | address |
| `DemoSkip` | `demo_skip` | demo console "skip payment" toggle per wallet | address |
| `DemoCircle` | `demo_circles` | circles the demo autopilot manages | circleId |
| `Meta` | `meta` | key/value: `last_block` (indexer cursor) and `contract_address` (a changed deployment resets the chain-derived tables) | key |

Design choices:
- **Idempotent ingestion.** The indexer polls `queryFilter` from `last_block + 1` in ≤ 2,000-block chunks and inserts with `createMany({ skipDuplicates: true })` in one transaction, so restarts never duplicate feed items.
- **Schema as code.** Tables are created from the Prisma schema at boot (`prisma db push` in `npm start`), so a fresh Railway Postgres works with zero manual steps. Migrations (`prisma migrate`) are the next step once the schema stabilises.
- **Rebuildable.** Drop the database and the feed rebuilds from `START_BLOCK`. When `CHITCHAIN_ADDRESS` changes (a redeploy), the indexer wipes the chain-derived tables itself and re-indexes, so circle ids never collide across contracts. Only agent mandates and logs are backend-native state.
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

## Wallet setup
1. Install BridgeKey from the Chrome Web Store link above and create a wallet.
2. Switch it to **MST Testnet** (the app offers to add the network: chain id 91562037, RPC `https://testnetrpc.mstblockchain.com`, explorer `https://testnet.mstscan.com`).
3. Claim 10 MST at the faucet for your address.
4. Open the app, click **Connect**, approve in BridgeKey. The network pill turns green.

## Running tests
```bash
npx hardhat test                 # 29 contract cases incl. balance invariant after every step
(cd backend && npm test)         # 60 cases: risk score, agent guardrails, v4 risk guard + fallback
(cd frontend && npm run typecheck && npx next lint && npm run build)   # never run the build while the dev server is up
```
Contract cases cover: creation and parameter validation, joining, Low/Medium/High/Unassessed and custom collateral multipliers, correct / wrong / duplicate contributions, valid / too-high / not-higher / non-member / after-deadline bids, winner selection, payout, discount, dividends and dust, default detection with full, partial and reserve-assisted coverage, double-default prevention, holdback (tier floor, flat %, release), withdrawal restrictions, unauthorised oracle/treasury calls, re-entrancy, settlement timing and multi-round completion.

## Running the demo
Open `/demo` (or use the API):
1. **Fund wallets** · 2. **Assess all** (A LOW, B MEDIUM, C LOW, D HIGH, E MEDIUM, each a `setRiskTier` tx) · 3. **New demo circle** (5 members, 30 s contributions + 30 s bidding, 0.1 MST, 10 % holdback) — the five custodial demo wallets join with 0.05 / 0.1 / 0.05 / 0.2 / 0.1 MST collateral.
4. In the room, ask the agent for B: "I need money this month". Its bid appears in the feed with a reason.
5. Toggle **skip** on D. At the next settlement the contract emits `DefaultDetected` for D: 0.1 MST taken from D's collateral, pot still full. The Default event card shows required / used / remaining / status and links to MSTScan.
6. Open **Round history** for pot, payout, discount, dividends per member and holdback of every settled round.

## AI bidding agent (CrewAI)

An autonomous bidding agent (v4) watches one auction for one custodial demo wallet and bids within the limits the user set. The AI only proposes; a deterministic Risk Guard and the Node backend execute. Experimental, testnet only.

```
 MONITOR ──► ANALYZE ──► DECIDE ──► VALIDATE ──► BID ──► VERIFY ──► CONTINUE
 snapshot    Auction      Bidding    Risk Guard   placeBid  1 conf.   next tick
 every 4 s   Analyst      Strategist (12 checks,  from the  TX_CON-   (or DONE
 REFRESH /   (CrewAI)     (CrewAI)   pure, unit-  custodial FIRMED    when the
 BID_SEEN                 WAIT|BID|  tested)      wallet    + feed    round ends)
                          STOP
```

**Architecture.** `agent/` is a Python 3.12 FastAPI service built on CrewAI: a `BiddingFlow` (`load_strategy → fetch_auction → analyse → strategise → clamp`) with two agents, the Auction Analyst and the Bidding Strategist, whose tools read the Node public endpoints `GET /auction/:id` and `GET /auction/:id/bids`. The strategist's output is a Pydantic `BidDecision` (`WAIT | BID | STOP`, discount in MST, reason code, reason, confidence), clamped deterministically in Python. The Node backend (`backend/src/ai/`) runs the loop, asks the crew (`POST /evaluate`, 20 s timeout), falls back to the same deterministic rules when the crew is unavailable, re-validates every proposal with the Risk Guard, and only then sends `placeBid` from the custodial demo wallet. Every step is an `AgentEvent` streamed over SSE to the room (`/ai/bidding/stream/:agentId`). Full endpoint list in [API.md](API.md) (v4).

**Safety.**
- The crew has no wallet and no write access; it cannot execute anything.
- Risk Guard, in order: `MAX_BID_EXCEEDED`, `MAX_DISCOUNT_PCT_EXCEEDED`, `ABOVE_CONTRACT_MAX`, `NOT_HIGHER_THAN_BEST`, `AUCTION_NOT_ACTIVE`, `WRONG_CIRCLE`, `WRONG_ROUND`, `STRATEGY_EXPIRED`, `AGENT_NOT_ENABLED`, `WALLET_UNAUTHORIZED`, `INSUFFICIENT_BALANCE` (0.02 MST gas reserve), `NOT_ELIGIBLE`.
- Autonomous bidding is an explicit permission; without it the agent pauses with "Needs your approval" and the user approves each bid.
- Hard caps: maximum discount in MST and in % of pot; a bid is never above them, never above the circle's max, and always beats the current best.
- After 3 failed transactions the agent pauses; expiry and round end finish it. Only custodial demo wallets A–E, only MST testnet, no real funds.
- Activity lines carry short operational text and a user-facing reason, never chain-of-thought. No fabricated bids, hashes or state.

**Demo mode.** With `demoMode` on, 25 s after activation (while bidding is open and once per round) another eligible custodial demo wallet places a **real** small bid on testnet (best + 2 % of pot, capped at 10 % of pot). It appears as "Demo rival (wallet C) bid 0.20 MST" with `simulated: false`, so the WAIT → new bid → BID story happens on-chain.

**Env.** Backend: `AI_AGENT_URL` (URL of the `ai-agent` Railway service; empty → deterministic fallback only). Agent service (`agent/`): `GROQ_API_KEY`, `CHITCHAIN_API_URL`, `MODEL` (default `groq/qwen/qwen3.8-27b` via LiteLLM), `PORT`. Local run: `cd agent && python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt && GROQ_API_KEY=… CHITCHAIN_API_URL=http://localhost:4000 .venv/bin/uvicorn main:app --port 8000`.

### Live proof (circle #8, round 1, MST testnet, 2026-09-29)

The agent was activated for demo wallet A with the goal "I need liquidity before Diwali", desired payout 0.22 MST, maximum discount 0.05 MST (20 %), high urgency, autonomous bidding on, demo rival on. Every row below is a real testnet transaction.

| Step | What happened | Transaction |
|---|---|---|
| Rival bid | Demo rival (wallet B) placed a 0.005 MST discount so the agent had something to respond to | [`0x7068…27d8`](https://testnet.mstscan.com/tx/0x7068468af61cb8344028918bafbd1ae66bc5aab5d061a6a0b16e10fa683b27d8) |
| Crew decision | Auction Analyst + Bidding Strategist (Groq via CrewAI) returned `BID 0.0299 MST`, reason code `DESIRED_PAYOUT`, confidence 0.9 | (off-chain) |
| Risk guard | Deterministic checks passed: below the 0.05 MST cap, below 20 % of the pot, above the current best, correct circle and round, eligible wallet | (off-chain) |
| Agent bid | Wallet A bid a 0.0299 MST discount (payout 0.22 MST), confirmed in block 5792441 | [`0x4f47…dc75`](https://testnet.mstscan.com/tx/0x4f47f111e5e089302605eea3d2e4941d3966436509332cda8edd599879a0dc75) |
| Settlement | Keeper settled round 1; wallet A won the pot | [`0x3151…3554`](https://testnet.mstscan.com/tx/0x3151ae918f39ee6283b4b18e136124b636b5a40aa78fe82195ae5c939e133554) |

The agent then reported "You hold the winning bid", waited through the rest of the window, and finished with "Auction ended".

### Cancel and refund (v2.1, 2026-09-29)

Three circles whose join window closed with only one member were cancelled by the keeper with the permissionless `cancel(circleId)`; the joined member's collateral was refunded to `claimable` (pull withdrawal).

| Circle | Transaction |
|---|---|
| #1 | [`0xb457…6905`](https://testnet.mstscan.com/tx/0xb45778783bffde7829b4a518d4d577d83056d764e86818640d840f04bc656905) |
| #2 | [`0xce8c…4a30`](https://testnet.mstscan.com/tx/0xce8c46f3f0f09158fda0ea4207d92e8026cad957441824dd0aba0fced4d24a30) |
| #3 | [`0xf2fe…3cb0`](https://testnet.mstscan.com/tx/0xf2fe5991e905bd8835a5fefdd94eca7f551e3b5391018dcd2d0312974f5a3cb0) |

### Risk tiers written on v2.1 (2026-09-29)

`POST /demo/assess-all` scored the five custodial demo wallets with the heuristic and the oracle wrote each tier on-chain with `setRiskTier`.

| Wallet | Tier | Transaction |
|---|---|---|
| A | Low | [`0xa488…761a`](https://testnet.mstscan.com/tx/0xa488bfc2470d949189da55ad14985ab98a151e734389494d7d5e40652833761a) |
| B | Medium | [`0x5e42…0b22`](https://testnet.mstscan.com/tx/0x5e42325ef1da668a34c757ac01bfb6658058d9adffa446cd7c3b4f1ea9320b22) |
| C | Low | [`0x455d…71ef`](https://testnet.mstscan.com/tx/0x455d1690d52c1cdd4c87dc116eafdee6ad69a6e3f614dc94d1ee885e65d671ef) |
| D | High | [`0xf878…095a`](https://testnet.mstscan.com/tx/0xf878278512d4c0acd82e1d89a0a81031fae8399cd42fe4b46b68ae0d50fd095a) |
| E | Medium | [`0x46ac…1df0`](https://testnet.mstscan.com/tx/0x46acbed4e3d679a00d780e8199ad579de33508ac64a52917cf3d25932f371df0) |

### Treasury withdrawal and background demo joins (v2.1, 2026-09-29)

| Step | What happened | Transaction |
|---|---|---|
| Treasury | `POST /admin/treasury/withdraw` sent `withdrawTreasury()` from the treasury wallet and moved 0.04 MST of accrued fees out of the contract | [`0xf3dc…76b2`](https://testnet.mstscan.com/tx/0xf3dcfbb969bfcab5193c9aa4408fd2c05f06d298a19cdb38a67d43f322bd76b2) |
| Demo circle #5 | `POST /demo/new-circle` now pre-checks funding, creates the circle, responds at once, and the autopilot join queue joined all five demo wallets in the background (5 of 5, no failures) | [`0xe969…8588`](https://testnet.mstscan.com/tx/0xe969cc1b0d370442e0564a5368e5c4ed67f9dbc51cf84a46fe15eadefdf8c588) |

### AI agent on v2.1 (circle #5, round 1, 2026-09-29)

Same autonomous flow as circle #8, now on the current contract: demo rival (wallet A) bid a 0.005 MST discount, the CrewAI crew returned `BID 0.0299 MST` (reason code `DESIRED_PAYOUT`), the risk guard passed, and wallet C's bid was confirmed in block 5795839; the agent then held the winning bid until the round settled.

| Step | Transaction |
|---|---|
| Demo rival bid (wallet A) | [`0x39ac…a401`](https://testnet.mstscan.com/tx/0x39ac4725599e88ad31d6159977aa690510326554cdd0c1036e2942cc53b4a401) |
| Agent bid (wallet C, 0.0299 MST discount, payout 0.22 MST) | [`0xe2b7…6511`](https://testnet.mstscan.com/tx/0xe2b78527c3865dcd27165a91b26b19396ad7d6a1eb4c3a0879910fc4101b6511) |

## MSTScan verification
Every action in the UI links to `https://testnet.mstscan.com/tx/<hash>`. Open the contract page, tab **Logs**, to see `PotReady`, `FullPotAccepted`, `FullPotDeclined`, `BidPlaced`, `DefaultDetected`, `HoldbackApplied`, `RoundSettled` and `DividendCredited` with their decoded arguments. Only hashes returned by the MST network are ever displayed.

## Honest limits
- Testnet prototype; MST testnet coins are used only for demonstration and have no monetary value. No real money is involved.
- Risk score is a **demo heuristic** on synthetic demo history, not a credit bureau score.
- AI bidding is experimental and does not guarantee optimal or profitable decisions.
- Keeper, risk oracle and **agent wallets are custodial/centralised** in the MVP (backend holds keys). Production: multisig oracle, session keys for the agent.
- Bids are public → last-second sniping possible. Production: commit–reveal.
- Usernames live in the backend database (the wallet is the identity); they are display names, not on-chain records.
- Low/Medium early winners are only partially secured (50 % / 75 % of remaining dues); the gap is backed by the circle reserve (fees + forfeits) up to its balance.
- Removed members forfeit collateral and past contributions to the pool (MVP rule; production refunds minus penalty at the end).
- MST is volatile → production needs a stable-value asset.
- Contract is tested but **unaudited**. Testnet only. Not "fully decentralised": keeper, oracle and agent are backend wallets.
- A real deployment would need legal and regulatory compliance; ChitChain is not an unregistered real-world chit fund operator.

## Legal
Prototype on testnet. Chit funds are regulated under the Chit Funds Act, 1982; ChitChain is infrastructure for registered organisers and informal friend circles, not an unregistered chit company.

## About

Built by **Vallur Sree Vardhan** ([@vardhan23v](https://github.com/vardhan23v)) for the MST Blockchain × NEWRRO Buildathon 2026, MST Blockchain Track.

- Live app: https://frontend-production-d322.up.railway.app
- Source: https://github.com/vardhan23v/chitchain
- Specs: [ARCHITECTURE.md](ARCHITECTURE.md) · [INTERFACE.md](INTERFACE.md) · [DESIGN.md](DESIGN.md) · [API.md](API.md)
