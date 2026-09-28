# ChitChain — the pot sits in a contract, not in anyone's account

ChitChain is a trust-minimised chit fund on **MST Blockchain**. Members lock collateral and pay into a pot that lives inside a smart contract. Each round the contract runs a discount auction, pays the winner, covers missed payments from the defaulter's collateral, and holds back part of early winners' payouts as security for their future dues. An AI risk engine prices each member's collateral (Low 0.5× · Medium 1× · High/Unassessed 2×) and an AI bidding agent bids for members based on a plain-language goal. Nobody, not the organiser and not the AI, ever holds the money.

Built in 24 h for **MST Blockchain × NEWRRO Buildathon 2026 — MST Blockchain Track**.

## Live demo
- App: `<vercel url>` · Backend: `<railway url>` · Demo video: `<link>`

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
backend/      Express + SQLite: indexer, keeper, risk engine, bidding agent, demo autopilot
frontend/     Next.js 14 + Tailwind + shadcn/ui
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
(cd backend && npm run dev) # http://localhost:4000
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
