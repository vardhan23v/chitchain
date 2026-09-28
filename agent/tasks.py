"""Crew tasks. Prompts are short and explicit; the strategy rules live in the strategist's task description."""
from __future__ import annotations

import json

from crewai import Agent, Task

from models import Auction, AuctionAnalysis, BidDecision, HistoryLine, Strategy


def _facts(strategy: Strategy, auction: Auction, cap_mst: float, min_win_mst: float) -> str:
    pot = auction.expectedPotMst
    return json.dumps({
        "circleId": auction.circleId, "round": auction.round, "roundsTotal": auction.roundsTotal, "status": auction.status,
        "expectedPotMst": pot, "bestDiscountMst": auction.bestDiscountMst, "bestPayoutMst": auction.bestPayoutMst,
        "bestBidderLabel": auction.bestBidderLabel, "bidCount": auction.bidCount, "secondsRemaining": auction.secondsRemaining,
        "biddingWindowSec": max(1, auction.biddingDeadline - auction.contributionDeadline),
        "memberCapMst": cap_mst, "minWinningDiscountMst": min_win_mst, "contractMaxDiscountMst": auction.maxDiscountMst,
        "desiredPayoutMst": strategy.desiredPayoutMst, "urgency": strategy.urgency, "riskTolerance": strategy.riskTolerance,
    })


def analyse_task(agent: Agent, strategy: Strategy, auction: Auction, cap_mst: float, min_win_mst: float) -> Task:
    return Task(
        description=(
            "Analyse this auction round. Facts (already fetched from the backend; only call a tool if a number is missing):\n"
            f"{_facts(strategy, auction, cap_mst, min_win_mst)}\n"
            "Report: competition (none = no bids, light = 1-2 bids, heavy = 3+ or a bid above half the member cap), "
            "time_pressure (low > 50% of window left, medium 25-50%, high < 25%), best_discount_mst, min_winning_discount_mst, "
            "cap_mst (memberCapMst), headroom_mst (cap minus min winning discount, 0 if negative), payout_at_min_mst (pot minus min winning discount), "
            "desired_reachable (false when pot minus desiredPayoutMst exceeds cap; true when no desired payout), and summary (one short sentence, under 25 words). "
            "Keep any thought to one line. Your Final Answer must be only the JSON object, nothing else."
        ),
        expected_output="A JSON object matching AuctionAnalysis with numbers in MST.",
        agent=agent,
        output_pydantic=AuctionAnalysis,
    )


def strategise_task(agent: Agent, strategy: Strategy, auction: Auction, analysis: AuctionAnalysis, history: list[HistoryLine]) -> Task:
    recent = "; ".join(f"{h.kind}: {h.text}" for h in history[-6:]) or "none"
    return Task(
        description=(
            f"Member goal: \"{strategy.goal}\". Urgency: {strategy.urgency}. Risk tolerance: {strategy.riskTolerance}. "
            f"Desired payout: {strategy.desiredPayoutMst if strategy.desiredPayoutMst is not None else 'not stated'} MST. "
            f"Hard cap on any bid: {analysis.cap_mst} MST.\n"
            f"Analyst: {analysis.model_dump_json()}\n"
            f"Recent agent activity: {recent}\n"
            "Rules, applied in order:\n"
            "1. If the auction status is not BIDDING: WAIT (reason_code NOT_BIDDING).\n"
            "2. If min_winning_discount_mst > cap_mst: STOP (MAX_REACHED). The member cannot win within their maximum.\n"
            "3. If a desired payout is stated and desired_reachable is false: STOP (PAYOUT_UNREACHABLE).\n"
            "4. If a desired payout is stated and the current best payout is already at or below it (payout_at_min_mst <= desired), the price is acceptable: "
            "WAIT when time_pressure is low or medium (PAYOUT_ACCEPTABLE); BID exactly min_winning_discount_mst when time_pressure is high (NEAR_EXPIRY).\n"
            "5. If a desired payout is stated and reachable: BID discount = pot minus desired payout, but at least min_winning_discount_mst (DESIRED_PAYOUT).\n"
            "6. HIGH urgency: BID aggressively, best discount + 5% of pot, never above cap_mst (URGENT).\n"
            "7. LOW urgency: prefer WAIT (LOW_URGENCY) unless time_pressure is high, then BID min_winning_discount_mst (NEAR_EXPIRY).\n"
            "8. MEDIUM urgency: WAIT while time_pressure is low (TIME_REMAINS); BID min_winning_discount_mst when medium or high (NEAR_EXPIRY).\n"
            "discount_mst must be null unless decision is BID, and must be between min_winning_discount_mst and cap_mst. "
            "reason: one or two plain sentences to the member, amounts in MST, no jargon. confidence between 0 and 1. "
            "Keep any thought to one line. Your Final Answer must be only the JSON object, nothing else."
        ),
        expected_output="A JSON object matching BidDecision: decision, discount_mst, reason_code, reason, confidence.",
        agent=agent,
        output_pydantic=BidDecision,
    )
