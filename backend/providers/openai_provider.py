"""
backend/providers/openai_provider.py
OpenAI provider.
"""
from __future__ import annotations
import time
from backend.providers.base import BaseProvider
from backend.models import Job, ProviderResult, ValidationEntry


class OpenAIProvider(BaseProvider):
    name = "OpenAI"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def _get_client(self, api_key: str):
        from openai import OpenAI
        return OpenAI(api_key=api_key, timeout=self.timeout)

    def query(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
        research_context: str | None = None,
    ) -> ProviderResult:
        from backend.key_manager import key_manager
        from loguru import logger
        
        prompt, json_schema = self._build_prompt(job, validation_map, research_context)
        json_schema["additionalProperties"] = False
        
        kwargs = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
            "top_p": self.top_p,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "attributes",
                    "schema": json_schema,
                    "strict": True
                }
            }
        }

        from tenacity import Retrying, stop_after_attempt, wait_exponential

        for attempt in Retrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            reraise=True
        ):
            with attempt:
                active_key = key_manager.get_active_key(self.name, self.api_keys)
                if not active_key:
                    raise RuntimeError(f"[{self.name}] No active API keys available (all on cooldown).")
                    
                client = self._get_client(active_key)
                try:
                    response = client.chat.completions.create(**kwargs)
                except Exception as e:
                    err_str = str(e).lower()
                    if any(k in err_str for k in ["429", "quota", "exhausted", "rate limit", "403"]):
                        logger.warning(f"[{self.name}] Quota/Auth error with key: {e}. Rotating...")
                        key_manager.mark_key_exhausted(self.name, active_key, self.api_keys)
                    raise e
                    
                raw = (response.choices[0].message.content or "").strip()
                input_tokens = 0
                output_tokens = 0
                if response.usage:
                    input_tokens = getattr(response.usage, "prompt_tokens", 0)
                    output_tokens = getattr(response.usage, "completion_tokens", 0)
                
                return ProviderResult(
                    raw_json=raw,
                    provider_name=self.name,
                    confidence=0.85 if raw else 0.0,
                    prompt_sent=prompt,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )

    def test_connection(self) -> tuple[bool, str]:
        try:
            from backend.key_manager import key_manager
            active_key = key_manager.get_active_key(self.name, self.api_keys)
            if not active_key:
                return (False, "No active API keys available.")
                
            client = self._get_client(active_key)
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Say 'OK' in one word."}],
            )
            text = (response.choices[0].message.content or "").strip()
            return (True, f"Connected — model responded: '{text[:50]}'")
        except Exception as exc:
            return (False, str(exc))
