"""
backend/rate_limiter.py
Async sliding-window rate limiter to enforce provider RPM (Requests Per Minute) bounds.
"""
import time
import asyncio
from typing import Dict

class ProviderRateLimiter:
    def __init__(self, rpm_limit: int = 60):
        self.rpm_limit = max(1, rpm_limit)
        self.lock = asyncio.Lock()
        self.timestamps = []

    async def acquire(self):
        async with self.lock:
            now = time.time()
            # Remove timestamps older than 60 seconds
            self.timestamps = [t for t in self.timestamps if now - t < 60.0]
            
            if len(self.timestamps) >= self.rpm_limit:
                # Wait until the oldest request drops off the 60-second window
                oldest = self.timestamps[0]
                sleep_time = 60.0 - (now - oldest) + 0.1
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                # Refresh now and prune again
                now = time.time()
                self.timestamps = [t for t in self.timestamps if now - t < 60.0]
            
            self.timestamps.append(now)

# Global in-memory registry for limiters per provider key
_LIMITERS: Dict[str, ProviderRateLimiter] = {}
_REGISTRY_LOCK = asyncio.Lock()

async def get_rate_limiter(key: str, rpm_limit: int) -> ProviderRateLimiter:
    async with _REGISTRY_LOCK:
        if key not in _LIMITERS or _LIMITERS[key].rpm_limit != rpm_limit:
            _LIMITERS[key] = ProviderRateLimiter(rpm_limit=rpm_limit)
        return _LIMITERS[key]
