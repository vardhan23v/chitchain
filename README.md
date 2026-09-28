# ChitChain — the pot sits in a contract, not in anyone's account

[![Live app](https://img.shields.io/badge/live%20app-Railway-7C3AED?logo=railway&logoColor=white)](https://frontend-production-d322.up.railway.app)
[![Backend](https://img.shields.io/badge/backend-health-16A34A?logo=express&logoColor=white)](https://backend-production-64738.up.railway.app/health)
[![MST Testnet](https://img.shields.io/badge/MST%20Testnet-chain%2091562037-C0392B)](https://testnet.mstscan.com)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&logoColor=white)](contracts/ChitChain.sol)
[![Hardhat tests](https://img.shields.io/badge/Hardhat%20tests-12%20passing-F7DF1E?logo=ethereum&logoColor=black)](test/ChitChain.test.ts)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](frontend)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](backend/prisma/schema.prisma)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway-4169E1?logo=postgresql&logoColor=white)](backend/prisma/schema.prisma)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

ChitChain is a trust-minimised chit fund on **MST Blockchain**. Members lock collateral and pay into a pot that lives inside a smart contract. Each round the contract runs a discount auction, pays the winner, covers missed payments from the defaulter's collateral, and holds back part of early winners' payouts as security for their future dues. An AI risk engine prices each member's collateral (Low 0.5× · Medium 1× · High/Unassessed 2×) and an AI bidding agent bids for members based on a plain-language goal. Nobody, not the organiser and not the AI, ever holds the money.

Built in 24 h for **MST Blockchain × NEWRRO Buildathon 2026 — MST Blockchain Track**.

## Live demo
- App: https://frontend-production-d322.up.railway.app
- Backend API: https://backend-production-64738.up.railway.app/health
- Demo video: `<link>`
- Hosting: frontend, backend and PostgreSQL all run on **Railway** (deployed with the Railway CLI, no GitHub integration).

## MST Blockchain integration
- Network: **MST Testnet** (chain ID `91562037`, RPC `https://testnetrpc.mstblockchain.com`)
- Contract: `ChitChain` at `<address>` → `https://testnet.mstscan.com/address/<address>`
- What runs on-chain and why: custody of pot + collateral + reserve, contributions, discount auction, settlement, post-win holdback, default coverage, member removal, dividends, reputation counters. Everything that moves money is a contract rule, so it can be verified on MSTScan.
- Wallet: **BridgeKey** (EIP-1193) · SDK: ethers v6 (same library `@mstblockchain/mst-sdk` wraps) · Scaffold structure from MST VibeKit (Hardhat + Next.js)
- Verified facts: `eth_chainId` on the testnet RPC returns `0x5752035` = 91562037; explorer is Blockscout at `testnet.mstscan.com` with `/tx/<hash>` and `/address/<addr>`.

## Verifiable transactions
| Action | Tx hash |
|---|---|
| Deploy | `<hash>` |
| Join (High tier, 2× collateral) | `<hash>` |
| Agent bid | `<hash>` |
| settleRound | `<hash>` |
| Missed payment covered | `<hash>` |

## Architecture
![architecture](architecture.png)

See [ARCHITECTURE.md](ARCHITECTURE.md) (behaviour), [INTERFACE.md](INTERFACE.md) (contract ABI), [DESIGN.md](DESIGN.md) (UI) and [API.md](API.md) (REST).

```
Members (BridgeKey) ──signed txs──►  ChitChain.sol (MST testnet)  ──►  MSTScan
        │                                  ▲        │ events
        ▼                                  │        ▼
Frontend (Next.js) ◄──REST/poll──►  Backend: Keeper · Indexer · Risk Engine · Bidding Agent ◄──► LLM API
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

Prerequisites: Node 20+, npm, a BridgeKey (or any EIP-1193) wallet with test MSTC from `https://faucet.masterstroke.academy`.

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

## Honest limits
- Risk score is a **heuristic** on synthetic demo history, not a credit bureau score.
- Keeper, risk oracle and **agent wallets are custodial/centralised** in the MVP (backend holds keys). Production: multisig oracle, session keys for the agent.
- Bids are public → last-second sniping possible. Production: commit–reveal.
- Low/Medium early winners are only partially secured (50 % / 75 % of remaining dues); the gap is backed by the circle reserve (fees + forfeits) up to its balance.
- Removed members forfeit collateral and past contributions to the pool (MVP rule; production refunds minus penalty at the end).
- MSTC is volatile → production needs a rupee-pegged asset.
- Contract is tested but **unaudited**. Testnet only.

## Legal
Prototype on testnet. Chit funds are regulated under the Chit Funds Act, 1982; ChitChain is infrastructure for registered organisers and informal friend circles, not an unregistered chit company.

## About

Built by **Vallur Sree Vardhan** ([@vardhan23v](https://github.com/vardhan23v)) for the MST Blockchain × NEWRRO Buildathon 2026, MST Blockchain Track.

- Live app: https://frontend-production-d322.up.railway.app
- Source: https://github.com/vardhan23v/chitchain
- Specs: [ARCHITECTURE.md](ARCHITECTURE.md) · [INTERFACE.md](INTERFACE.md) · [DESIGN.md](DESIGN.md) · [API.md](API.md)
