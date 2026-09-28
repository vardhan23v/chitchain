# ChitChain AI bidding crew (agent/)

Python 3.12 + CrewAI + FastAPI. This service **decides only**: it receives a strategy brief, the current auction
snapshot and recent activity from the Node backend, runs a two-agent CrewAI flow, and returns one of `WAIT | BID | STOP`
with a discount in MST. It has no wallet, no private keys and no write access to anything. The Node backend runs a
deterministic Risk Guard on every proposal before any transaction.

## Flow (`flow.py`)
`load_strategy → fetch_auction (tools) → analyse (Auction Analyst) → strategise (Bidding Strategist) → clamp`

- `agents.py`: two agents with `role / goal / backstory`, `verbose=False`, no delegation.
- `tools.py`: `get_active_auction`, `get_current_bid`, `get_bid_history`, `get_round_state` (httpx to the Node public
  endpoints `GET /auction/:id` and `GET /auction/:id/bids`).
- `tasks.py`: the strategist's task description holds the explainable rules (acceptable → WAIT; near expiry and within
  limits → BID; above max → STOP; unreachable payout → STOP; HIGH urgency → aggressive within max; LOW → prefer waiting).
  Outputs are Pydantic models via `output_pydantic`.
- `clamp`: deterministic. Never above the member's cap (wei cap, % of pot, contract max, 10 % of pot when risk tolerance is
  low); never below best + 1 % of pot when bidding; STOP when the desired payout is unreachable within the cap.

## API
- `GET /health` → `{ok, model, llm, api}`
- `POST /evaluate` body `{strategy, auction, history}` → `{decision, discount_mst, reason_code, reason, confidence, analyst}`.
  `503 NO_LLM` when `GROQ_API_KEY` is missing, `502 CREW_FAILED` / `504 CREW_TIMEOUT` on failures; the Node backend then
  falls back to its deterministic rules.

## Env
| Var | Meaning |
|---|---|
| `GROQ_API_KEY` | Groq key (required for real decisions) |
| `CHITCHAIN_API_URL` | Node backend base URL |
| `MODEL` | LiteLLM model id, default `groq/qwen/qwen3.8-27b` |
| `PORT` | set by Railway |

Telemetry is disabled in code (`CREWAI_DISABLE_TELEMETRY=true`, `OTEL_SDK_DISABLED=true`).

## Local run
```
cd agent
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
GROQ_API_KEY=… CHITCHAIN_API_URL=https://backend-production-64738.up.railway.app .venv/bin/uvicorn main:app --port 8000
```
Railway: service `ai-agent`, root directory `agent/`, `railway.json` starts uvicorn and checks `/health`.
Set the backend's `AI_AGENT_URL` to this service's URL.
