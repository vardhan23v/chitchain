import pytest
from validator import CircleBidPayload

def test_valid_payload():
    payload = CircleBidPayload(
        circle_id=1,
        round_number=2,
        max_discount_percent=12.5,
        wallet_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        urgency_score=0.7
    )
    assert payload.circle_id == 1
    assert payload.wallet_address.startswith("0x")

def test_invalid_eth_address():
    with pytest.raises(ValueError):
        CircleBidPayload(
            circle_id=1,
            round_number=1,
            max_discount_percent=5.0,
            wallet_address="invalid_eth_address_string_without_prefix",
            urgency_score=0.5
        )
