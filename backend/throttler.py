"""
backend/throttler.py
Simple token-bucket rate limiter for AI provider calls.
"""
from __future__ import annotations
import time
import threading


class TokenBucket:
    """Thread-safe token bucket rate limiter."""

    def __init__(self, rate: float, burst: float | None = None) -> None:
        self._rate    = rate / 60.0          # tokens per second
        self._burst   = burst or rate
        self._tokens  = float(self._burst)
        self._last    = time.monotonic()
        self._lock    = threading.Lock()

    def acquire(self) -> None:
        """Block until a token is available."""
        while True:
            with self._lock:
                now = time.monotonic()
                elapsed = now - self._last
                self._tokens = min(self._burst, self._tokens + elapsed * self._rate)
                self._last = now
                if self._tokens >= 1.0:
                    self._tokens -= 1.0
                    return
                wait = (1.0 - self._tokens) / self._rate
            # Sleep outside the lock
            time.sleep(wait)


class ProviderThrottler:
    """Manages one TokenBucket per AI provider."""

    def __init__(self) -> None:
        self._buckets: dict[str, TokenBucket] = {}
        self._lock = threading.Lock()

    def configure(self, provider_name: str, rpm: float) -> None:
        """Set or update the rate for a provider (requests per minute)."""
        with self._lock:
            self._buckets[provider_name] = TokenBucket(rate=max(rpm, 1))

    def acquire(self, provider_name: str) -> None:
        """Block until the provider's rate limit allows a request."""
        with self._lock:
            bucket = self._buckets.get(provider_name)
        if bucket:
            bucket.acquire()

    def reset(self) -> None:
        """Clear all buckets (call before each processing run)."""
        with self._lock:
            self._buckets.clear()


throttler = ProviderThrottler()
