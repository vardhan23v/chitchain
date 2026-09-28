"""Pydantic shapes shared by the API, the flow and the crew tasks (mirrors backend/src/ai/types.ts)."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Level = Literal["low", "medium", "high"]
DecisionKind = Literal["WAIT", "BID", "STOP"]


class Strategy(BaseModel):
    """The user's brief as sent by the Node backend (MST numbers, never wei, never keys)."""
    model_config = ConfigDict(extra="ignore")
    agentId: str = ""
    circleId: int
    member: str = ""
    goal: str
    desiredPayoutMst: Optional[float] = None
    maxDiscountMst: float
    maxDiscountPct: float = Field(ge=0, le=50)
    urgency: Level = "medium"
    riskTolerance: Level = "medium"
    expiresAt: Optional[int] = None
    autonomous: bool = False


class Auction(BaseModel):
    """GET /auction/:circleId snapshot (only the fields the crew needs; wei strings are ignored)."""
    model_config = ConfigDict(extra="ignore")
    circleId: int
    round: int = 0
    roundsTotal: int = 0
    status: Literal["CONTRIBUTION", "BIDDING", "SETTLING", "INACTIVE"] = "INACTIVE"
    expectedPotMst: float = 0
    collectedMst: float = 0
    maxDiscountMst: float = 0
    bestDiscountMst: float = 0
    bestPayoutMst: float = 0
    bestBidder: Optional[str] = None
    bestBidderLabel: Optional[str] = None
    biddingDeadline: int = 0
    contributionDeadline: int = 0
    secondsRemaining: int = 0
    bidCount: int = 0


class HistoryLine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ts: int = 0
    kind: str = ""
    text: str = ""
    reason: Optional[str] = None
    data: Optional[dict[str, Any]] = None


class EvaluateRequest(BaseModel):
    strategy: Strategy
    auction: Auction
    history: list[HistoryLine] = Field(default_factory=list)


class AuctionAnalysis(BaseModel):
    """Structured output of the Auction Analyst (facts only, no recommendation)."""
    competition: Literal["none", "light", "heavy"] = "none"
    time_pressure: Literal["low", "medium", "high"] = "low"
    best_discount_mst: float = 0
    min_winning_discount_mst: float = 0
    cap_mst: float = 0
    headroom_mst: float = 0
    payout_at_min_mst: float = 0
    desired_reachable: bool = True
    summary: str = ""


class BidDecision(BaseModel):
    """Structured output of the Bidding Strategist (a proposal; clamped in Python, re-validated in Node)."""
    decision: DecisionKind = "WAIT"
    discount_mst: Optional[float] = None
    reason_code: str = "CREW"
    reason: str = ""
    confidence: float = Field(default=0.5, ge=0, le=1)


class EvaluateResponse(BaseModel):
    decision: DecisionKind
    discount_mst: Optional[float]
    reason_code: str
    reason: str
    confidence: float
    analyst: dict[str, Any]
