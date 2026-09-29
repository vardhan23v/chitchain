from validator import AgentDecisionResult

def test_decision_result_serialization():
    decision = AgentDecisionResult(
        should_bid=True,
        recommended_discount_percent=14.2,
        confidence_score=0.88,
        reasoning="High urgency and attractive pot dividend yield"
    )
    json_data = decision.model_dump()
    assert json_data["should_bid"] is True
    assert json_data["recommended_discount_percent"] == 14.2
    assert json_data["confidence_score"] == 0.88
