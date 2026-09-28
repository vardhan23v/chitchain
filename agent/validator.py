from pydantic import BaseModel, Field, field_validator
from typing import Optional

class CircleBidPayload(BaseModel):
    circle_id: int = Field(gt=0, description="The positive integer circle ID")
    round_number: int = Field(gt=0, description="Current round number")
    max_discount_percent: float = Field(ge=0.0, le=50.0, description="Maximum discount percentage willing to offer")
    wallet_address: str = Field(min_length=42, max_length=42, description="Ethereum 0x address")
    urgency_score: float = Field(default=0.5, ge=0.0, le=1.0, description="Normalized participant capital urgency")

    @field_validator('wallet_address')
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        if not v.startswith('0x'):
            raise ValueError('Address must begin with 0x')
        return v.lower()

class AgentDecisionResult(BaseModel):
    should_bid: bool
    recommended_discount_percent: float = Field(ge=0.0, le=50.0)
    confidence_score: float = Field(ge=0.0, le=1.0)
    reasoning: str
