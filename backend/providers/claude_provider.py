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
        research_context: str | None = None,
    ) -> ProviderResult:
        import json
        prompt, json_schema = self._build_prompt(job, validation_map, research_context)
        client = self._get_client()

        max_tokens = min(200 * len(job.attributes) + 512, 4096)

        tools = [
            {
                "name": "extract_attributes",
                "description": "Extract the product attributes into the required format.",
                "input_schema": json_schema
            }
        ]

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
            "tools": tools,
            "tool_choice": {"type": "tool", "name": "extract_attributes"}
        }

        from tenacity import Retrying, stop_after_attempt, wait_exponential

        for attempt in Retrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            reraise=True
        ):
            with attempt:
                response = client.messages.create(**kwargs)

                raw = ""
                for block in response.content:
                    if block.type == "tool_use" and block.name == "extract_attributes":
                        raw = json.dumps(block.input)
                        break
                    elif hasattr(block, "text") and not raw:
                        # Fallback if it didn't call the tool properly
                        raw = block.text.strip()

                input_tokens = 0
                output_tokens = 0
                if hasattr(response, "usage") and response.usage:
                    input_tokens = getattr(response.usage, "input_tokens", 0)
                    output_tokens = getattr(response.usage, "output_tokens", 0)
                
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
