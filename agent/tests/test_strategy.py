from strategy import calculate_optimal_bid

def test_urgent_bid_calculation():
    bid = calculate_optimal_bid(
        pot_size=10.0,
        current_round=1,
        total_rounds=10,
        urgency=0.9,
        rival_highest_bid=5.0
    )
    assert bid >= 5.5
    assert bid <= 30.0

def test_patient_bid_calculation():
    bid = calculate_optimal_bid(
        pot_size=10.0,
        current_round=8,
        total_rounds=10,
        urgency=0.1,
        rival_highest_bid=0.0
    )
    assert bid < 5.0
