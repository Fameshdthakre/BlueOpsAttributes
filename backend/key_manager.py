"""
backend/key_manager.py
Manages multi-API key rotation and cooldowns across the system.
"""
import time
import threading
from typing import Dict, List
from loguru import logger

class APIKeyPoolManager:
    def __init__(self):
        # Maps a specific API key string to its cooldown expiration timestamp
        self._cooldowns: Dict[str, float] = {}
        self._lock = threading.Lock()

    def get_active_key(self, provider_name: str, keys: List[str]) -> str | None:
        """Returns the first API key that is not currently on cooldown."""
        if not keys:
            return None
            
        with self._lock:
            now = time.time()
            for idx, key in enumerate(keys):
                exp = self._cooldowns.get(key, 0)
                if now >= exp:
                    if exp > 0:
                        logger.info(f"[{provider_name}] Rotating to Key #{idx + 1} (Cooldown cleared)")
                    return key
                    
            logger.warning(f"[{provider_name}] ALL {len(keys)} API keys are currently on cooldown!")
            return None

    def mark_key_exhausted(self, provider_name: str, key: str, keys_list: List[str] = None, cooldown_seconds: int = 600):
        """Mark a key as exhausted (e.g. 429 / Quota Error) and place it on cooldown."""
        if not key:
            return
            
        with self._lock:
            exp = time.time() + cooldown_seconds
            self._cooldowns[key] = exp
            
            # Find which key number this was
            key_idx = "?"
            if keys_list and key in keys_list:
                key_idx = str(keys_list.index(key) + 1)
                
            masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "***"
            logger.warning(f"[{provider_name}] API Key #{key_idx} ({masked}) marked exhausted. On cooldown for {cooldown_seconds}s. Rotating to next key if available.")

# Global instance
key_manager = APIKeyPoolManager()
