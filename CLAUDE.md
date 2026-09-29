# ChitChain: working rules for Claude

ChitChain is a chit-fund dApp on the MST Blockchain testnet: Solidity contract, Node/Express backend with Prisma/Postgres, Next.js 14 frontend, and a Python CrewAI bidding service. It handles MST testnet tokens only. Never introduce real money, INR or rupee symbols.

## Read only what the task needs

Follow the `focused-code-edit` skill for every change. Start from the folder map below, open the page or module the task names, follow imports only when required, and stop. Do not read the whole repo, and do not say you did unless you did.

## Folder map

| Area | Path | Touch it when |
|---|---|---|
| Frontend (Next.js 14 app router, Tailwind, shadcn, framer-motion, ethers v6) | `frontend/app`, `frontend/components`, `frontend/hooks`, `frontend/lib` | UI, copy, client behaviour |
| Frontend theme | `frontend/app/globals.css` (tokens, `.glass`, `.liquid*`), `frontend/tailwind.config.ts` | Only for theme-level changes |
| Frontend shell | `frontend/components/shell/{SideRail,TopStrip,MobileTabs}.tsx`, `frontend/app/layout.tsx` | Navigation changes |
| Motion primitives | `frontend/components/motion/{Reveal,CountUp,Flash}.tsx` | Reuse, do not duplicate |
| Backend API | `backend/src/routes/*`, `backend/src/index.ts` | Only when the user asks for API or backend changes |
| Backend loops | `backend/src/{keeper,autopilot,indexer}.ts`, `backend/src/ai/loop.ts` | Chain automation, AI agent |
| Chain access | `backend/src/chain.ts` (read cache, `sendTx`, custodial wallets) | Never log keys |
| Database | `backend/prisma/schema.prisma`, `backend/src/db/*` | Schema changes need a deploy (`prisma db push` runs on start) |
| Auth | `backend/src/auth/*`, `frontend/hooks/useAuth.tsx`, `frontend/lib/session.ts` | Only on explicit request |
| Contract | `contracts/*.sol`, `test/*.ts`, `scripts/*` | Only on explicit request; a change means a testnet redeploy |
| CrewAI service | `agent/` (Python 3.12, FastAPI, CrewAI, Groq) | AI decision logic only; it never executes transactions |
| Docs | `README.md`, `API.md`, `ARCHITECTURE.md`, `INTERFACE.md`, `DESIGN.md`, `AUDIT.md` | Keep in sync with behaviour you change |

For frontend-only tasks, `backend/`, `contracts/`, `agent/`, `deployments/`, `test/` and every `.env*` file are off limits.

## House style (frontend)

- Light liquid-glass theme is the design: navy primary, ice-blue tints, `Card` + `.glass` surfaces, liquid pill buttons. Do not switch to dark, do not add hover lifts, gradients or new decoration.
- Sentence case everywhere, no all-caps labels, no em dashes in copy, no arrows appended to button text, Inter for text and JetBrains Mono only for addresses, hashes and block numbers.
- Real data only. When something is unavailable show a polished state ("Circle data is temporarily unavailable."), never placeholders like "needs backend" and never invented numbers.
- Every amount is MST and testnet is labelled. Buttons say what happens ("Place a bid") and keep the same name through the flow and toast.
- Respect reduced motion: use `components/motion/*` and the single `MotionConfig` in `components/Providers.tsx`.

## Commands

```bash
# frontend (never run `next build` while the dev server is up; it wipes .next)
cd frontend && npm run typecheck && npx next lint && npm run build
# backend
cd backend && npm run typecheck && npm test && npm run build
# contract
npx hardhat test
```

Local preview: the `frontend` launch config; `frontend/.env.local` points at the Railway backend and the live contract.

## Deploy and git

- Railway services: `backend`, `frontend`, `ai-agent`, `Postgres` in project `chitchain`. Deploy with `npx -y @railway/cli up --service <name> --detach` from that service's folder (`agent/` for `ai-agent`).
- Commit locally with a clear message. The user pushes to GitHub themselves; give them the `git push origin main` command instead of pushing.
- Never commit `.env*`, `agent/.venv`, private keys or API keys. Never print secrets in output.

## Safety

- Only the smart contract moves funds. Roles gate website actions only.
- The AI agent proposes; the deterministic risk guard in `backend/src/ai/riskGuard.ts` validates; execution happens only after it passes. Keep that separation.
- Custodial demo wallets A to E are the only wallets the backend signs for.
