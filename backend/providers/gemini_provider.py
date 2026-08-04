"""
backend/providers/gemini_provider.py
Gemini AI provider with web search tools.
"""
from __future__ import annotations
import time
from backend.providers.base import BaseProvider
from backend.models import Job, ProviderResult, ValidationEntry


class GeminiProvider(BaseProvider):
    name = "Gemini"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def _get_client(self, api_key: str):
        from google import genai
        return genai.Client(api_key=api_key, http_options={'timeout': self.timeout})

    def query(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
        research_context: str | None = None,
    ) -> ProviderResult:
        from backend.key_manager import key_manager
        from loguru import logger
        from google.genai import types

        prompt, json_schema = self._build_prompt(job, validation_map, research_context)

        tools = [types.Tool(google_search=types.GoogleSearch())] if self.enable_web_search else None
        
        config_kwargs = {
            "temperature": self.temperature,
            "top_k": self.top_k,
            "top_p": self.top_p,
        }
        if tools:
            config_kwargs["tools"] = tools
            
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_schema"] = json_schema
            
        config = types.GenerateContentConfig(**config_kwargs)

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
                    response = client.models.generate_content(
                        model=self.model,
                        contents=prompt,
                        config=config,
                    )
                except Exception as e:
                    err_str = str(e).lower()
                    if any(k in err_str for k in ["429", "quota", "exhausted", "rate limit", "403"]):
                        logger.warning(f"[{self.name}] Quota/Auth error with key: {e}. Rotating...")
                        key_manager.mark_key_exhausted(self.name, active_key, self.api_keys)
                    raise e
                raw_text = (response.text or "").strip()
                input_tokens = 0
                output_tokens = 0
                if response.usage_metadata:
                    input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0)
                    output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0)
                
                return ProviderResult(
                    raw_json=raw_text,
                    provider_name=self.name,
                    confidence=0.85 if raw_text else 0.0,
                    prompt_sent=prompt,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens
                )

    def test_connection(self) -> tuple[bool, str]:
        try:
            from google.genai import types
            from backend.key_manager import key_manager
            active_key = key_manager.get_active_key(self.name, self.api_keys)
            if not active_key:
                return (False, "No active API keys available.")
            
            client = self._get_client(active_key)
            response = client.models.generate_content(
                model=self.model,
                contents="Say 'OK' in one word.",
                config=types.GenerateContentConfig(temperature=0),
            )
            text = (response.text or "").strip()
            return (True, f"Connected — model responded: '{text[:50]}'")
        except Exception as exc:
            return (False, str(exc))
