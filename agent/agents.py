"""The two CrewAI agents. They only propose; the Node backend validates and executes."""
from __future__ import annotations

import os

from typing import Any

from crewai import LLM, Agent
from crewai.llms.cache import strip_cache_breakpoint

DEFAULT_MODEL = "groq/qwen/qwen3.8-27b"


class GroqSafeLLM(LLM):
    """CrewAI's LiteLLM path forwards its internal `cache_breakpoint` marker on messages; Groq rejects unknown
    message properties, so strip the marker before the request (native providers already do this)."""

    def _format_messages_for_provider(self, messages: list[Any]) -> list[Any]:
        out = super()._format_messages_for_provider(messages)
        for m in out:
            if isinstance(m, dict):
                strip_cache_breakpoint(m)
        return out

    def supports_function_calling(self) -> bool:
        """Use CrewAI's text (ReAct) tool protocol: Groq's native tool-call parser rejects the structured-output
        tool call the executor sends for `output_pydantic`, so native function calling is switched off."""
        return False


def model_name() -> str:
    return os.environ.get("MODEL", DEFAULT_MODEL)


def build_llm() -> LLM:
    """Groq through LiteLLM. GROQ_API_KEY is read by LiteLLM from the environment only.
    REASONING_EFFORT defaults to "none" (Qwen3 on Groq: no thinking tokens, ~3 s per call); set "low" for gpt-oss models."""
    effort = os.environ.get("REASONING_EFFORT", "none").strip() or None
    return GroqSafeLLM(model=model_name(), temperature=0.2, max_tokens=1200, reasoning_effort=effort)


def auction_analyst(llm: LLM, tools: list) -> Agent:
    return Agent(
        role="Auction Analyst",
        goal="Report the numbers of one chit-fund auction round: competition, time pressure, smallest winning discount, headroom under the member cap.",
        backstory="You read on-chain auction data (MST testnet). A bid is a DISCOUNT the bidder gives up; payout = pot - discount; "
                  "the largest discount wins. Facts only, never a recommendation. The facts are in the task; call a tool only if a number is missing.",
        tools=tools,
        llm=llm,
        verbose=False,
        allow_delegation=False,
        max_iter=2,
        cache=False,
    )


def bidding_strategist(llm: LLM, tools: list) -> Agent:
    return Agent(
        role="Bidding Strategist",
        goal="Turn the analyst's numbers and the member's brief into exactly one of WAIT, BID or STOP with a discount in MST when bidding, applying the rules literally.",
        backstory="You act for one member of an on-chain savings circle. Never exceed the member's cap, never invent numbers, "
                  "explain in one or two plain sentences to the member. You only propose; the backend validates and executes. "
                  "The numbers are in the task; call a tool only if one is missing.",
        tools=tools,
        llm=llm,
        verbose=False,
        allow_delegation=False,
        max_iter=2,
        cache=False,
    )
