"""
backend/providers/claude_provider.py
Claude provider.
"""
from __future__ import annotations
import time
from backend.providers.base import BaseProvider
from backend.models import Job, ProviderResult, ValidationEntry


class ClaudeProvider(BaseProvider):
    name = "Claude"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._client = None

    def _get_client(self):
        if self._client is None:
            import anthropic
            self._client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)
        return self._client

    def query(
        self,
        job: Job,
        validation_map: dict[str, ValidationEntry | None],
    ) -> ProviderResult:
        prompt = self._build_prompt(job, validation_map)
        client = self._get_client()

        max_tokens = min(200 * len(job.attributes) + 512, 4096)

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": "You are an automated data extraction tool. You must ONLY output a valid JSON object. Do not include any thinking, conversational text, markdown wrapping, or explanations.",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
        }
        
        if self.enable_web_search:
            kwargs["tools"] = [{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 5,
            }]

        from tenacity import Retrying, stop_after_attempt, wait_exponential

        for attempt in Retrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            reraise=True
        ):
            with attempt:
                response = client.messages.create(**kwargs)

                raw_parts = []
                for block in response.content:
                    if hasattr(block, "text"):
                        raw_parts.append(block.text)
                raw = " ".join(raw_parts).strip()

                return ProviderResult(
                    raw_json=raw,
                    provider_name=self.name,
                    confidence=0.85 if raw else 0.0,
                    prompt_sent=prompt,
                )

    def test_connection(self) -> tuple[bool, str]:
        try:
            client = self._get_client()
            response = client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": "Say 'OK' in one word."}],
            )
            text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text = block.text.strip()
                    break
            return (True, f"Connected — model responded: '{text[:50]}'")
        except Exception as exc:
            return (False, str(exc))
