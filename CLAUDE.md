# ChitChain: working rules for Claude

ChitChain is a chit-fund dApp on the MST Blockchain testnet: Solidity contract, Node/Express backend with Prisma/Postgres, Next.js 14 frontend, and a Python CrewAI bidding service. It handles MST testnet tokens only. Never introduce real money, INR or rupee symbols.

## Read only what the task needs

Follow the `focused-code-edit` skill for every change. Start from the folder map below, open the page or module the task names, follow imports only when required, and stop. Do not read the whole repo, and do not say you did unless you did.

## Folder map

| Area | Path | Touch it when |
|---|---|---|
| Frontend (Next.js 14 app router, Tailwind, shadcn, framer-motion, ethers v6) | `frontend/app`, `frontend/components`, `frontend/hooks`, `frontend/lib` | UI, copy, client behaviour |
| Frontend theme | `frontend/app/globals.css` (tokens, `.card-hover`, `.grid-texture`, `.status-dot`), `frontend/tailwind.config.ts` | Only for theme-level changes |
| Frontend shell | `frontend/components/shell/{Sidebar,TopHeader,MobileTabs}.tsx`, `frontend/lib/routes.ts`, `frontend/app/layout.tsx` | Navigation changes |
| Motion primitives | `frontend/components/motion/{Reveal,CountUp,Flash,MotionPref,MotionToggle,ScrollProgress,Parallax,SplitText,CursorGlow,DrawLine,Spotlight,Magnetic,RollingClock}.tsx`, `frontend/components/landing/{MoneyFlow,LiveTicker,PotStory}.tsx`, `frontend/components/HowItWorks.tsx` | Reuse, do not duplicate; DESIGN.md §15 lists what each does |
| Round flow UI (contract v2.2) | `frontend/components/room/{RecipientDecision,RoundTimeline}.tsx`, `frontend/components/{AuctionCard,BidDialog}.tsx`, `frontend/components/dashboard/NextActionCard.tsx`, `frontend/lib/payout.ts` | Recipient accept / decline, payout offers; DESIGN.md §16 |
| Usernames and profile | `frontend/components/profile/*`, `frontend/components/MemberName.tsx`, `backend/src/users/username.ts`, `backend/src/db/usernames.ts`, `backend/src/routes/users.ts` | Display names only; the wallet stays the identity |
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

- Dark midnight theme with an MST red accent is the design (v2, 2026-09-29): background `#0D0F13`, `Card` = `bg-surface border border-white/[0.08] rounded-2xl shadow-card`, red pill primary buttons, `secondary` = `bg-white/[0.06] border-white/10`. No light mode, no glass or blur surfaces, no gradients other than the body glow (which follows the pointer, `CursorGlow`) and the 1 px `spotlight` border highlight; the only lift allowed is `.card-hover` (2 px up, brighter border, 150 ms).
- Red is for the primary action, the active nav indicator and chain/contract references. Money in the contract is `pot` (sky), the AI agent is `agent` (violet); success, warning and danger keep their semantic colours.
- Sentence case everywhere, no all-caps labels, no em dashes in copy, no arrows appended to button text, Inter for text and JetBrains Mono only for addresses, hashes and block numbers. Numbers use `.tnum`.
- Real data only. When something is unavailable show a polished state ("Circle data is temporarily unavailable."), never placeholders like "needs backend" and never invented numbers.
- Every amount is MST and testnet is labelled. Buttons say what happens ("Place a bid") and keep the same name through the flow and toast.
- Respect reduced motion: use `components/motion/*` and the `MotionPrefProvider` in `components/Providers.tsx`. Read `useReducedMotion` / `useMotionOK` from `components/motion/MotionPref`, never from framer, so the Animations toggle in the footer and sidebar (System, On, Off, mirrored on `html[data-motion]`) is honoured everywhere. Transforms and opacity only, 400 ms or less for transitions; scroll-linked and ambient loops (ring spin, ticker, glow, pinned How-it-works) are allowed and must go static when motion is off. Keyboard focus ring is red at 60 %.

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
