"""BiddingFlow: load_strategy → fetch_auction → analyse → strategise → clamp.

The crew proposes; this file's final clamp is deterministic; the Node backend re-validates with its Risk Guard.
This service never touches a wallet.
"""
from __future__ import annotations

import os

os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

from typing import Any, Optional  # noqa: E402

import litellm  # noqa: E402
from crewai import Crew, Process  # noqa: E402

# Fail fast on Groq rate limits (free tier: 7k input tokens/min per model): one retry, then the Node backend falls back.
litellm.num_retries = int(os.environ.get("LLM_RETRIES", "1"))
from crewai.flow.flow import Flow, listen, start  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from agents import auction_analyst, bidding_strategist, build_llm  # noqa: E402
from models import Auction, AuctionAnalysis, BidDecision, EvaluateResponse, HistoryLine, Strategy  # noqa: E402
from tasks import analyse_task, strategise_task  # noqa: E402
from tools import ANALYST_TOOLS, STRATEGIST_TOOLS, fetch_snapshot  # noqa: E402

LOW_RISK_CAP_PCT = 10.0


def cap_mst(s: Strategy, a: Auction) -> float:
    """Strictest cap: member wei cap, member % of pot, contract max, 10 % of pot when risk tolerance is low."""
    cap = s.maxDiscountMst
    cap = min(cap, a.expectedPotMst * s.maxDiscountPct / 100.0)
    if a.maxDiscountMst > 0:
        cap = min(cap, a.maxDiscountMst)
    if s.riskTolerance == "low":
        cap = min(cap, a.expectedPotMst * LOW_RISK_CAP_PCT / 100.0)
    return round(max(cap, 0.0), 6)


def min_winning_mst(a: Auction) -> float:
    """Smallest discount that beats the best: best + 1 % of pot."""
    return round(a.bestDiscountMst + max(a.expectedPotMst * 0.01, 1e-6), 6)


def clamp_decision(d: BidDecision, s: Strategy, a: Auction) -> BidDecision:
    """Deterministic final clamp: never above the cap, never below best + 1 % when bidding, STOP when unreachable."""
    if a.status != "BIDDING":
        return BidDecision(decision="WAIT", discount_mst=None, reason_code="NOT_BIDDING", reason="Bidding is not open right now; waiting.", confidence=1.0)
    cap = cap_mst(s, a)
    floor = min_winning_mst(a)
    if floor > cap:
        return BidDecision(decision="STOP", discount_mst=None, reason_code="MAX_REACHED",
                           reason=f"The current best discount ({a.bestDiscountMst:g} MST) is already at or above your maximum ({cap:g} MST); the agent cannot bid within your limits.",
                           confidence=1.0)
    if s.desiredPayoutMst is not None and a.expectedPotMst - s.desiredPayoutMst > cap:
        need = round(a.expectedPotMst - s.desiredPayoutMst, 6)
        return BidDecision(decision="STOP", discount_mst=None, reason_code="PAYOUT_UNREACHABLE",
                           reason=f"Reaching a payout of {s.desiredPayoutMst:g} MST would need a {need:g} MST discount, above your maximum of {cap:g} MST.",
                           confidence=1.0)
    if d.decision != "BID":
        return d.model_copy(update={"discount_mst": None})
    if d.discount_mst is None or d.discount_mst <= 0:
        return d.model_copy(update={"decision": "WAIT", "discount_mst": None, "reason_code": "NO_AMOUNT"})
    amount = min(max(float(d.discount_mst), floor), cap)
    return d.model_copy(update={"discount_mst": round(amount, 6)})


class BidState(BaseModel):
    strategy: Optional[Strategy] = None
    auction: Optional[Auction] = None
    history: list[HistoryLine] = Field(default_factory=list)
    refreshed: bool = False
    analysis: Optional[AuctionAnalysis] = None
    proposal: Optional[BidDecision] = None
    final: Optional[BidDecision] = None


class BiddingFlow(Flow[BidState]):
    """One evaluation. kickoff(inputs={"strategy": {...}, "auction": {...}, "history": [...]})."""

    def __init__(self) -> None:
        super().__init__()
        self._llm = build_llm()

    @start()
    def load_strategy(self) -> Strategy:
        if self.state.strategy is None:
            raise ValueError("strategy missing")
        if self.state.auction is None:
            raise ValueError("auction missing")
        return self.state.strategy

    @listen(load_strategy)
    def fetch_auction(self, _: Strategy) -> Auction:
        """Refresh the snapshot from the backend when it is reachable and describes the same circle + round; otherwise keep the one Node sent."""
        assert self.state.auction is not None
        live = fetch_snapshot(self.state.auction.circleId)
        if live is not None:
            try:
                fresh = Auction.model_validate(live)
                if fresh.circleId == self.state.auction.circleId and fresh.round == self.state.auction.round:
                    self.state.auction = fresh
                    self.state.refreshed = True
            except Exception:
                pass
        return self.state.auction

    @listen(fetch_auction)
    def analyse(self, auction: Auction) -> AuctionAnalysis:
        s, a = self.state.strategy, auction
        assert s is not None
        analyst = auction_analyst(self._llm, ANALYST_TOOLS)
        task = analyse_task(analyst, s, a, cap_mst(s, a), min_winning_mst(a))
        out = Crew(agents=[analyst], tasks=[task], process=Process.sequential, verbose=False).kickoff()
        analysis = out.pydantic if isinstance(out.pydantic, AuctionAnalysis) else AuctionAnalysis.model_validate_json(out.raw)
        self.state.analysis = analysis
        return analysis

    @listen(analyse)
    def strategise(self, analysis: AuctionAnalysis) -> BidDecision:
        s, a = self.state.strategy, self.state.auction
        assert s is not None and a is not None
        strategist = bidding_strategist(self._llm, STRATEGIST_TOOLS)
        task = strategise_task(strategist, s, a, analysis, self.state.history)
        out = Crew(agents=[strategist], tasks=[task], process=Process.sequential, verbose=False).kickoff()
        proposal = out.pydantic if isinstance(out.pydantic, BidDecision) else BidDecision.model_validate_json(out.raw)
        self.state.proposal = proposal
        return proposal

    @listen(strategise)
    def clamp(self, proposal: BidDecision) -> BidDecision:
        s, a = self.state.strategy, self.state.auction
        assert s is not None and a is not None
        self.state.final = clamp_decision(proposal, s, a)
        return self.state.final


def to_response(flow: BiddingFlow) -> EvaluateResponse:
    st = flow.state
    final = st.final or BidDecision(decision="WAIT", reason_code="NO_RESULT", reason="The crew did not return a decision; waiting.", confidence=0.0)
    analyst: dict[str, Any] = st.analysis.model_dump() if st.analysis else {}
    analyst["refreshed_from_backend"] = st.refreshed
    if st.proposal is not None and st.proposal != final:
        analyst["proposal"] = st.proposal.model_dump()
        analyst["clamped"] = True
    return EvaluateResponse(decision=final.decision, discount_mst=final.discount_mst, reason_code=final.reason_code,
                            reason=final.reason, confidence=final.confidence, analyst=analyst)
