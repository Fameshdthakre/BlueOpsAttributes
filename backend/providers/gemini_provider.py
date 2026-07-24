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

        last_exc = None
        for attempt in range(1, self.max_retries + 1):
            try:
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
            except Exception as exc:
                last_exc = exc
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)

        raise RuntimeError(f"Gemini failed after {self.max_retries} retries: {last_exc}")

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
