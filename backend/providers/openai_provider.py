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
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key, timeout=self.timeout)
        return self._client

    def query(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
    ) -> ProviderResult:
        prompt = self._build_prompt(job, validation_map)
        client = self._get_client()

        kwargs = {
            "model": self.model,
            "input": prompt,
            "temperature": self.temperature,
            "top_p": self.top_p,
        }
        if self.enable_web_search:
            kwargs["tools"] = [{"type": "web_search_preview"}]

        last_exc = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = client.responses.create(**kwargs)
                raw = (response.output_text or "").strip()
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

        raise RuntimeError(f"OpenAI failed after {self.max_retries} retries: {last_exc}")

    def test_connection(self) -> tuple[bool, str]:
        try:
            client = self._get_client()
            response = client.responses.create(
                model=self.model,
                input="Say 'OK' in one word.",
            )
            text = (response.output_text or "").strip()
            return (True, f"Connected — model responded: '{text[:50]}'")
        except Exception as exc:
            return (False, str(exc))
