import time
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("agent.telemetry")

class AgentTelemetry:
    def __init__(self):
        self.executions: list[Dict[str, Any]] = []

    def record_run(self, circle_id: int, execution_time_ms: float, decision: Dict[str, Any]):
        entry = {
            "circle_id": circle_id,
            "duration_ms": execution_time_ms,
            "decision": decision,
            "timestamp": time.time()
        }
        self.executions.append(entry)
        logger.info(f"AI Decision for Circle #{circle_id} executed in {execution_time_ms:.2f}ms")

    def get_summary(self) -> Dict[str, Any]:
        total_runs = len(self.executions)
        avg_time = sum(e["duration_ms"] for e in self.executions) / max(total_runs, 1)
        return {
            "total_decisions": total_runs,
            "average_duration_ms": round(avg_time, 2)
        }

telemetry = AgentTelemetry()
