"""
backend/providers/gemini_provider.py
Gemini AI provider with web search tools.
"""
from __future__ import annotations
import time
from backend.providers.base import BaseProvider
from backend.api.core.models import Job, ProviderResult, ValidationEntry


class GeminiProvider(BaseProvider):
    name = "Gemini"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def query(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
    ) -> ProviderResult:
        from google.genai import types

        prompt = self._build_prompt(job, validation_map)
        client = self._get_client()

        tools = [types.Tool(google_search=types.GoogleSearch())] if self.enable_web_search else None
        
        config_kwargs = {
            "temperature": self.temperature,
            "top_k": self.top_k,
            "top_p": self.top_p,
        }
        if tools:
            config_kwargs["tools"] = tools
        else:
            config_kwargs["response_mime_type"] = "application/json"
            
        config = types.GenerateContentConfig(**config_kwargs)

        from tenacity import Retrying, stop_after_attempt, wait_random_exponential

        for attempt in Retrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_random_exponential(multiplier=1, max=10),
            reraise=True
        ):
            with attempt:
                response = client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                )
                raw = (response.text or "").strip()
                return ProviderResult(
                    raw_json=raw,
                    provider_name=self.name,
                    confidence=0.85 if raw else 0.0,
                    prompt_sent=prompt,
                )

    def test_connection(self) -> tuple[bool, str]:
        try:
            from google.genai import types
            client = self._get_client()
            response = client.models.generate_content(
                model=self.model,
                contents="Say 'OK' in one word.",
                config=types.GenerateContentConfig(temperature=0),
            )
            text = (response.text or "").strip()
            return (True, f"Connected — model responded: '{text[:50]}'")
        except Exception as exc:
            return (False, str(exc))
