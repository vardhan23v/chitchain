import time
from typing import Any, Optional

class SimpleTTLCache:
    def __init__(self, default_ttl_seconds: int = 15):
        self.default_ttl = default_ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        expires = time.time() + (ttl or self.default_ttl)
        self._store[key] = (value, expires)

agent_cache = SimpleTTLCache()
