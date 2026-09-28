"""ChitChain AI bidding crew service (FastAPI). Decides only; never signs or sends transactions."""
from __future__ import annotations

import asyncio
import logging
import os

os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

from fastapi import FastAPI  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from agents import model_name  # noqa: E402
from flow import BiddingFlow, to_response  # noqa: E402
from models import EvaluateRequest, EvaluateResponse  # noqa: E402

log = logging.getLogger("ai-agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

app = FastAPI(title="ChitChain AI bidding crew", version="4.0.0", docs_url=None, redoc_url=None)
EVALUATE_TIMEOUT_SEC = float(os.environ.get("EVALUATE_TIMEOUT_SEC", "45"))


def llm_configured() -> bool:
    return bool(os.environ.get("GROQ_API_KEY", "").strip())


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": model_name(), "llm": llm_configured(), "api": os.environ.get("CHITCHAIN_API_URL", "")}


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(req: EvaluateRequest) -> EvaluateResponse | JSONResponse:
    if not llm_configured():
        return JSONResponse(status_code=503, content={"error": "GROQ_API_KEY not configured; the Node backend falls back to deterministic rules", "code": "NO_LLM"})
    flow = BiddingFlow()
    inputs = {"strategy": req.strategy.model_dump(), "auction": req.auction.model_dump(), "history": [h.model_dump() for h in req.history]}
    try:
        await asyncio.wait_for(asyncio.to_thread(flow.kickoff, inputs=inputs), timeout=EVALUATE_TIMEOUT_SEC)
    except asyncio.TimeoutError:
        log.warning("evaluate timed out for agent %s", req.strategy.agentId)
        return JSONResponse(status_code=504, content={"error": "crew evaluation timed out", "code": "CREW_TIMEOUT"})
    except Exception as e:  # noqa: BLE001 - any crew/LLM failure → Node falls back
        log.warning("evaluate failed for agent %s: %s", req.strategy.agentId, e.__class__.__name__)
        return JSONResponse(status_code=502, content={"error": f"crew failed: {e.__class__.__name__}", "code": "CREW_FAILED"})
    out = to_response(flow)
    log.info("agent %s circle %s round %s → %s %s (%s)", req.strategy.agentId, req.auction.circleId, req.auction.round, out.decision, out.discount_mst, out.reason_code)
    return out
