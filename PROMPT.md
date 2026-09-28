# ChitChain — Master Build Prompt

> **How to use:** create a **new, empty GitHub repo** during the hackathon, copy these files into its root, then paste this whole file into your AI coding assistant (Claude Code, Cursor, etc.) and say *"Start Phase 0."* Run one phase at a time. Don't let the assistant jump ahead.
>
> Files that must be in the repo root:
> | File | Role |
> |---|---|
> | `ARCHITECTURE.md` | System design, contract logic, rules — **source of truth for behaviour** |
> | `INTERFACE.md` | Exact contract interface: types, events, errors, functions |
> | `DESIGN.md` | UI/UX spec: colours, pages, components, microcopy |
> | `architecture.png` | Diagram for README and slides |
> | `PROMPT.md` | This file |

---

## 0. Your role

You are a **senior Solidity + full-stack TypeScript engineer** pair-programming with a student team in a **24-hour hackathon** (MST Blockchain × NEWRRO Buildathon 2026, MST Blockchain Track).

You are building **ChitChain**: a trust-minimised chit fund where **the pot sits in a smart contract, not in anyone's account**. The contract collects contributions, runs a discount auction, pays winners, covers missed payments from collateral, and holds back part of early winners' payouts as security. An **AI risk engine** prices each member's collateral, and an **AI bidding agent** bids for members based on their goals.

Before writing any code, **read `ARCHITECTURE.md`, `INTERFACE.md` and `DESIGN.md` in full**. If they conflict: `INTERFACE.md` wins for signatures, `ARCHITECTURE.md` wins for behaviour, `DESIGN.md` wins for UI.

---

## 1. Hard rules (never break these)

### 1.1 Hackathon compliance
1. This is a **brand-new repo** created during the event. Write fresh code. Open-source libraries, SDKs and scaffolds are allowed.
2. **Commit after every working step** with a clear conventional message (`feat:`, `test:`, `fix:`, `docs:`). Judges inspect commit history.
3. The team must be able to explain every line. Prefer simple, readable code over clever code. No giant files (> 300 lines → split).
4. Never fake data in the final demo. Every transaction shown must be a real MST testnet transaction.

### 1.2 MST facts — use these, never invent others
| Fact | Value | Status |
|---|---|---|
| Chain type | EVM-compatible; `@mstblockchain/mst-sdk` wraps **ethers v6** | Verified |
| Testnet RPC | `https://testnetrpc.mstblockchain.com` | Verified |
| Scaffold | `npx @mstblockchain/mst-vibe-kit` (Hardhat + Next.js) | Verified |
| Explorer | `https://mstscan.com` | From guide |
| Faucet | `https://faucet.masterstroke.academy` | From guide |
| Chain ID | — | **VERIFY** |
| BridgeKey injected provider name | assume EIP-1193 `window.ethereum` | **VERIFY** |
| MSTScan tx URL path | assume `/tx/<hash>` | **VERIFY** |
| MCP endpoint write support | — | **VERIFY** (not required for MVP) |

For every **VERIFY** item: put it in env/config, add a `// VERIFY:` comment, and **stop and ask me** to check it. Don't guess.

### 1.3 Security
- Pull payments only (`claimable` + `withdraw`). Never send MSTC inside loops.
- OpenZeppelin `ReentrancyGuard` on `settleRound`, `withdraw`, `withdrawTreasury`.
- No external calls inside `settleRound`.
- Exact `msg.value` checks. `receive()` and `fallback()` revert.
- Bounded loops (≤ 20 members).
- **No secrets in git.** Create `.gitignore` (with `.env*` except `.env.example`) **before** the first commit.

### 1.4 AI boundaries
- Risk numbers come from the **deterministic heuristic** in `ARCHITECTURE.md §4.1`. The LLM only writes explanations and bid plans.
- AI's only privileged on-chain power is `setRiskTier` (via the `riskOracle` wallet) and `placeBid` from **custodial demo agent wallets** (must be labelled in UI and README).
- Every LLM call has a timeout (8 s) and a non-LLM fallback.

### 1.5 Scope
- If a phase runs > 30 min over target, stop and propose cuts.
- **Cut order:** SSE → pool-check endpoint → profile page polish → animations.
- **Never cut:** contract correctness + tests, collateral cover + holdback, bidding agent, MSTScan links, README with addresses/hashes.

---

## 2. Tech stack (fixed)

| Layer | Choice |
|---|---|
| Contracts | Solidity ^0.8.20, Hardhat, OpenZeppelin, `@nomicfoundation/hardhat-toolbox` |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, lucide-react, framer-motion (light), ethers v6, zod, sonner |
| Backend | Node 20, Express, TypeScript, ethers v6 (or `@mstblockchain/mst-sdk`), better-sqlite3, zod, node-cron/setInterval |
| AI | Gemini or any OpenAI-compatible API via `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` |
| Hosting | Frontend → Vercel · Backend → Railway |
| Package manager | npm (workspaces optional) |

---

## 3. Target repo structure

```
chitchain/
├─ contracts/
│  └─ ChitChain.sol
├─ test/
│  └─ ChitChain.test.ts
├─ scripts/
│  ├─ deploy.ts
│  └─ seed-demo.ts            # fund demo wallets, create demo circle
├─ deployments/
│  └─ mstTestnet.json         # address, deploy tx, block
├─ hardhat.config.ts
├─ backend/
│  ├─ src/
│  │  ├─ index.ts             # express app
│  │  ├─ config.ts            # env parsing with zod
│  │  ├─ chain.ts             # provider, wallets, contract instances
│  │  ├─ abi/ChitChain.json
│  │  ├─ db.ts                # sqlite schema + queries
│  │  ├─ indexer.ts
│  │  ├─ keeper.ts
│  │  ├─ risk/{features,score,explain,seed}.ts
│  │  ├─ agent/bidder.ts
│  │  ├─ llm.ts               # single LLM wrapper with timeout + fallback
│  │  └─ routes/{circles,members,agent,feed}.ts
│  └─ package.json
├─ frontend/
│  ├─ app/{page.tsx,create/,circle/[id]/,member/[addr]/,demo/}
│  ├─ components/{ui/,MemberCard,PotMeter,Countdown,TierChip,TxLink,AddressPill,MstcAmount,FeedItem,AgentPanel,NetworkPill}.tsx
│  ├─ lib/{wallet.ts,contract.ts,api.ts,errors.ts,format.ts}
│  └─ package.json
├─ .env.example
├─ .gitignore
├─ README.md
├─ ARCHITECTURE.md · INTERFACE.md · DESIGN.md · PROMPT.md · architecture.png
```

### Env variables (`.env.example`)
```
# chain
MST_RPC_URL=https://testnetrpc.mstblockchain.com
MST_CHAIN_ID=            # VERIFY
DEPLOYER_PRIVATE_KEY=
KEEPER_PRIVATE_KEY=
RISK_ORACLE_PRIVATE_KEY=
AGENT_WALLET_KEYS=       # comma-separated, demo only (custodial)
TREASURY_ADDRESS=
CHITCHAIN_ADDRESS=
START_BLOCK=

# ai
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=

# frontend
NEXT_PUBLIC_CHITCHAIN_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_RPC_URL=https://testnetrpc.mstblockchain.com
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_EXPLORER=https://mstscan.com
```

---

## 4. Build phases

Each phase lists **goal → tasks → files → acceptance criteria → commit**. Don't start the next phase until acceptance criteria pass.

### Phase 0 — Setup (≈ 45 min)
**Goal:** a compiling skeleton connected to MST testnet.

Tasks:
1. `.gitignore` first, then scaffold with VibeKit. If it fails, set up Hardhat + Next.js manually to the structure in §3.
2. Add `mstTestnet` network in `hardhat.config.ts` from env.
3. Create `.env.example` (§3). Ask me to fill `.env` and confirm the **VERIFY** items.
4. Add a `scripts/ping.ts` that prints chain ID, latest block and deployer balance.

Acceptance:
- `npx hardhat compile` ✓
- `npx hardhat run scripts/ping.ts --network mstTestnet` prints chain ID + balance > 0
- `npm run dev` in `frontend/` renders a page

Commit: `chore: scaffold hardhat + next.js for MST testnet`

---

### Phase 1 — Smart contract (≈ 5 h, highest priority)
**Goal:** `ChitChain.sol` implementing `INTERFACE.md` exactly, with behaviour from `ARCHITECTURE.md §3`.

Tasks (implement in this order, test as you go):
1. Types, storage, constructor(`riskOracle`, `treasury`), errors, events.
2. `setRiskTier` (oracle only) and `requiredCollateral` (`Unassessed` = 2×).
3. `createCircle` with validation (`3 ≤ maxMembers ≤ 20`, `baseCollateral ≥ contribution`, `feeBps ≤ 300`, `roundDuration > 0`).
4. `join` (tier snapshot, exact collateral, auto-start when full), `leave`, `cancel`.
5. `contribute`.
6. `placeBid` (eligible only, `≤ 40%` of expected pot, **strictly greater** than current best).
7. `settleRound` exactly per `ARCHITECTURE.md §3.3`:
   missed payments → collateral → reserve → remove · fee → reserve · winner selection · post-win holdback (§3.2) · dividends to other active members · dust rule · completion (collateral → claimable, reserve → treasury).
8. `withdraw`, `withdrawTreasury`, all view functions.
9. NatSpec on every external function.

Tests (`test/ChitChain.test.ts`) — all 12 cases from `ARCHITECTURE.md §3.7` **plus** the 5 invariants in `INTERFACE.md §7`. Use a helper `runRound(payers[], bids[])` to keep tests short. Reconcile balances to the wei.

Deploy:
- `scripts/deploy.ts` → deploys, writes `deployments/mstTestnet.json`, prints address + tx hash.
- Export ABI to `backend/src/abi/` and `frontend/lib/` (script `npm run export-abi`).

Acceptance:
- `npx hardhat test` all green, including invariant checks
- Contract deployed on MST testnet; address visible on MSTScan
- ABI exported to both apps

Commits: `feat(contract): core circle lifecycle` → `feat(contract): settlement, holdback, reserve` → `test: edge cases + invariants` → `chore: deploy to MST testnet`

---

### Phase 2 — Frontend core (≈ 4 h, can start in parallel from the INTERFACE draft)
**Goal:** members can create, join, contribute, bid and withdraw from the browser with BridgeKey.

Tasks:
1. Apply `DESIGN.md §3–4` tokens in `globals.css` + Tailwind config; install shadcn components listed in `DESIGN.md §7`.
2. `lib/wallet.ts`: connect, read account/chain, switch/add MST testnet, listen for account/chain changes.
3. `lib/contract.ts`: read-only contract (JsonRpcProvider) + signer contract.
4. `lib/errors.ts`: map custom errors → messages in `DESIGN.md §8`.
5. `lib/format.ts`: `formatMstc`, `shortAddr`, `txUrl`.
6. Layout shell with `NetworkPill` + wallet menu (`DESIGN.md §5`).
7. Pages: `/` (circle list), `/create` (form + live summary), `/circle/[id]` (hero screen per `DESIGN.md §6.3`, including the primary-action-button state table).
8. Transaction UX flow per `DESIGN.md §8` (toast states, MSTScan links, no success before mined).
9. Read state by polling contract views every 3 s until the backend feed exists.

Acceptance:
- With 2 browsers/wallets: create → join both → contribute → bid → wait → (manual) settle → withdraw, all from UI on testnet
- Wrong network shows "Switch to MST Testnet"
- Mobile layout works at 375 px width

Commits: `feat(ui): design tokens + shell` → `feat(ui): create + list circles` → `feat(ui): circle room actions`

---

### Phase 3 — Backend: keeper, indexer, feed (≈ 3 h)
**Goal:** rounds settle automatically; UI gets a live event feed.

Tasks:
1. `config.ts` with zod env validation (fail fast).
2. `db.ts`: tables `events(id, circle_id, round, name, args_json, tx_hash, block, ts)`, `agent_logs`, `risk_cache`, `meta(last_block)`.
3. `indexer.ts`: every 3 s `queryFilter` from `last_block+1` to latest (chunk ≤ 2,000 blocks), insert events idempotently (unique on `tx_hash + log_index`).
4. `keeper.ts`: every 3 s, for each Active circle with `now > roundDeadline`, call `settleRound`; treat "already settled" as success; log tx hash.
5. Routes: `GET /circles`, `GET /circles/:id`, `GET /feed?circleId=&since=`, `GET /health`.
6. CORS for the frontend origin.
7. Frontend: switch feed + room refresh to backend polling every 2–3 s; render `FeedItem` per `DESIGN.md §9`.

Acceptance:
- Round ends → keeper settles within ~5 s with no clicks
- Feed shows every event with MSTScan links
- Restarting the backend doesn't duplicate events

Commits: `feat(backend): indexer + sqlite` → `feat(backend): keeper auto-settlement` → `feat(ui): live feed`

---

### Phase 4 — AI risk engine (≈ 2.5 h)
**Goal:** members get a transparent risk tier that sets their collateral on-chain.

Tasks:
1. `risk/seed.ts`: synthetic history for demo wallets (A good, B okay, C good, D bad, E thin). Store with `source = 'SYNTHETIC'`.
2. `risk/features.ts`: merge on-chain `reputation()` + indexed events + synthetic seed.
3. `risk/score.ts`: heuristic exactly per `ARCHITECTURE.md §4.1`. **Cold start → 60 (Medium)**, no division by zero. Return `{score, tier, factors[]}`.
4. `risk/explain.ts`: LLM → max 2 sentences from `factors` only; template fallback.
5. Routes: `GET /members/:addr/risk`, `POST /members/:addr/assess` (computes + sends `setRiskTier` tx, returns hash).
6. Frontend `/member/[addr]` per `DESIGN.md §6.4` with the "heuristic, synthetic data" disclaimer. Show tier chip + required collateral in the Join dialog.

Acceptance:
- Assessing D → `RiskTierSet(D, High)` on MSTScan → D's Join dialog asks for 2× collateral
- Unassessed wallet's Join dialog asks for 2×
- LLM offline → explanation still shows (template)

Commits: `feat(ai): risk heuristic + assess endpoint` → `feat(ui): member profile`

---

### Phase 5 — AI bidding agent (≈ 3 h, do NOT cut)
**Goal:** a member states a goal in plain language; the agent re-plans each round and bids on-chain.

Tasks:
1. `llm.ts`: one wrapper — `chatJSON(prompt, zodSchema, {timeoutMs: 8000})`.
2. `agent/bidder.ts`:
   - Input: `{circleId, member, goal}`; store as an active agent mandate.
   - Each round (hook into keeper loop after `CircleStarted`/`RoundSettled`): read `getRound`, `getMember`, rounds left, best bid.
   - Ask LLM for `{bidThisRound: boolean, discountPct: number, reason: string}`.
   - Deterministic guardrails: skip if not eligible; clamp to `maxDiscount`; ensure strictly above `bestDiscount`; never exceed member's stated max.
   - Fallback without LLM: urgent goals → bid `bestDiscount + 5%` of pot; relaxed goals → don't bid.
   - Send `placeBid` from the member's **custodial demo agent wallet**; log `{reason, discount, txHash}` to `agent_logs`.
3. Routes: `POST /agent/mandate`, `GET /agent/logs?circleId=`.
4. Frontend `AgentPanel` (`DESIGN.md §6.3`): goal input, "custodial demo wallet" label, latest decision + reason + tx link; agent actions styled with `--agent` colour in the feed.

Acceptance:
- "I need money this month" → agent bid appears on-chain in the current round with a readable reason
- "No hurry, maximise dividends" → agent skips, reason logged
- Agent never sends an invalid bid (no `BidTooHigh`/`BidNotHigher` reverts in logs)

Commits: `feat(ai): bidding agent with guardrails` → `feat(ui): agent panel`

---

### Phase 6 — Demo console, polish, deploy, README (≈ 3 h)
**Goal:** a stranger can open the link and follow a live circle; judges get every required artefact.

Tasks:
1. `/demo` page (`DESIGN.md §6.5`): fund demo wallets, "Assess all", per-member "skip payment" toggle (backend simply doesn't auto-contribute for that wallet), "New demo circle (30 s rounds)", tx counter.
2. `scripts/seed-demo.ts`: one command to fund wallets + create circle + assess.
3. Polish: motion per `DESIGN.md §10` (respect reduced motion), empty/loading/edge states per `DESIGN.md §12`, "Contract ↗" header link, footer legal line.
4. Deploy frontend to Vercel and backend to Railway; set env vars in dashboards.
5. `README.md` using the template in §6 below.
6. Rehearse the demo in `ARCHITECTURE.md §7` **twice on testnet**; note real tx hashes for README.

Acceptance: everything in §7 "Definition of done".

Commits: `feat(ui): demo console` → `chore: deploy` → `docs: README with MST integration + tx hashes`

---

## 5. Coding conventions

- TypeScript `strict: true`. No `any` except at the BridgeKey provider boundary (commented).
- Amounts are always `bigint` wei in code; format only at the UI edge.
- One contract instance factory per app (`lib/contract.ts`, `backend/src/chain.ts`).
- Handle every promise; log errors with context (`[keeper] circle 3 round 2: …`).
- Components < 150 lines; pull logic into hooks (`useCircle`, `useWallet`, `useFeed`).
- No placeholder `TODO: implement` in delivered code — implement it or tell me it's cut.

---

## 6. README template (fill in Phase 6)

```md
# ChitChain — the pot sits in a contract, not in anyone's account
One-paragraph pitch.

## Live demo
- App: <vercel url> · Backend: <railway url> · Demo video: <link>

## MST Blockchain integration
- Network: MST Testnet (chain ID <id>, RPC https://testnetrpc.mstblockchain.com)
- Contract: `ChitChain` at `<address>` → <mstscan link>
- What runs on-chain and why: custody of pot + collateral, contributions, auction, settlement, holdback, defaults, reputation
- Wallet: BridgeKey · SDK: ethers v6 / @mstblockchain/mst-sdk · Scaffold: MST VibeKit

## Verifiable transactions
| Action | Tx hash |
|---|---|
| Deploy | … |
| Join (High tier, 2× collateral) | … |
| Agent bid | … |
| settleRound | … |
| Missed payment covered | … |

## Architecture
![architecture](architecture.png) · see ARCHITECTURE.md, INTERFACE.md, DESIGN.md

## Run locally
steps + env vars

## Honest limits
heuristic risk score on synthetic data · custodial keeper/oracle/agent wallets · public bids · partial security for Low/Medium early winners backed by reserve · MSTC volatility · unaudited contract

## Legal
Prototype on testnet. Chit funds are regulated under the Chit Funds Act, 1982; ChitChain is infrastructure for registered organisers and informal friend circles, not an unregistered chit company.
```

---

## 7. Definition of done (submission checklist)

- [ ] Contract deployed on MST testnet; address in README
- [ ] ≥ 5 real tx hashes in README (deploy, join, bid, settle, covered)
- [ ] All Hardhat tests + invariants pass
- [ ] Public GitHub repo with incremental commit history
- [ ] Frontend live on Vercel; BridgeKey connect works; mobile OK
- [ ] Backend live; keeper auto-settles; feed live
- [ ] Risk assess sets tier on-chain; D pays 2×
- [ ] Agent places a reasoned on-chain bid
- [ ] Every tx in UI links to MSTScan
- [ ] Demo rehearsed twice; ~24 txs in ~3 min
- [ ] Demo video recorded; submission form filled (GitHub, contract address, tx hash, demo link, video)
- [ ] Optional: 30 s Instagram reel tagging @mstblockchain and @newrro_tech

---

## 8. How to work with me

- **Start of each phase:** list files you'll create/change and any decision you need from me (one short block).
- **During:** small commits; run tests/commands yourself and show pass/fail, not just code.
- **End of each phase:** show acceptance criteria as a checklist with ✓/✗, the commit message, and time spent vs target.
- **Blocked on MST specifics:** stop and tell me exactly what to check (BridgeKey settings, MSTScan page, docs URL). Don't guess.
- **Running late:** propose cuts from §1.5 before continuing.

**Begin with Phase 0.**
