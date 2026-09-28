"""Read-only tools over the Node backend's public auction endpoints. No wallet, no writes."""
from __future__ import annotations

import json
import os

import httpx
from crewai.tools import tool

API_URL = os.environ.get("CHITCHAIN_API_URL", "http://localhost:4000").rstrip("/")
TIMEOUT = 6.0


def _get(path: str) -> str:
    """GET the backend and return the JSON body as text, or a short error string (never raises)."""
    try:
        r = httpx.get(f"{API_URL}{path}", timeout=TIMEOUT)
        if r.status_code != 200:
            return json.dumps({"error": f"backend responded {r.status_code}", "path": path})
        return r.text
    except httpx.HTTPError as e:
        return json.dumps({"error": f"backend unreachable: {e.__class__.__name__}", "path": path})


def fetch_snapshot(circle_id: int) -> dict | None:
    """Direct (non-agent) fetch of the auction snapshot; None when unavailable."""
    try:
        data = json.loads(_get(f"/auction/{int(circle_id)}"))
        return data if isinstance(data, dict) and "error" not in data else None
    except ValueError:
        return None


@tool("get_active_auction")
def get_active_auction(circle_id: int) -> str:
    """Auction snapshot for a circle: status, round, pot, best discount, deadlines, seconds remaining (MST amounts in *Mst fields)."""
    return _get(f"/auction/{int(circle_id)}")


@tool("get_current_bid")
def get_current_bid(circle_id: int) -> str:
    """Current best bid of a circle: discount and payout in MST, holder label, bid count."""
    raw = _get(f"/auction/{int(circle_id)}")
    try:
        d = json.loads(raw)
        if "error" in d:
            return raw
        return json.dumps({
            "bestDiscountMst": d.get("bestDiscountMst"), "bestPayoutMst": d.get("bestPayoutMst"),
            "bestBidder": d.get("bestBidder"), "bestBidderLabel": d.get("bestBidderLabel"), "bidCount": d.get("bidCount"),
        })
    except ValueError:
        return raw


@tool("get_bid_history")
def get_bid_history(circle_id: int) -> str:
    """Recent on-chain bids of a circle, newest first (round, label, discount and payout in wei, tx hash, timestamp)."""
    return _get(f"/auction/{int(circle_id)}/bids?limit=20")


@tool("get_round_state")
def get_round_state(circle_id: int) -> str:
    """Round timing of a circle: round, rounds total, status, deadlines (unix seconds), seconds remaining."""
    raw = _get(f"/auction/{int(circle_id)}")
    try:
        d = json.loads(raw)
        if "error" in d:
            return raw
        return json.dumps({k: d.get(k) for k in ("round", "roundsTotal", "status", "contributionDeadline", "biddingDeadline", "secondsRemaining", "nowSec")})
    except ValueError:
        return raw


ALL_TOOLS = [get_active_auction, get_current_bid, get_bid_history, get_round_state]
# Split per agent to keep each prompt small (Groq free tier: 7k input tokens/min per model).
ANALYST_TOOLS = [get_active_auction, get_round_state]
STRATEGIST_TOOLS = [get_current_bid, get_bid_history]
