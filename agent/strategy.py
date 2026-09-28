import math

def calculate_optimal_bid(
    pot_size: float,
    current_round: int,
    total_rounds: int,
    urgency: float,
    rival_highest_bid: float = 0.0
) -> float:
    remaining_rounds = max(total_rounds - current_round + 1, 1)
    base_discount = 2.0 + (urgency * 15.0)
    
    if rival_highest_bid > 0:
        target = rival_highest_bid + 0.5
        return min(max(target, base_discount), 30.0)

    time_decay = math.log1p(remaining_rounds) / math.log1p(total_rounds)
    optimal = base_discount * time_decay
    
    return round(min(max(optimal, 1.0), 30.0), 2)
