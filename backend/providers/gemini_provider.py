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
        return genai.Client(api_key=api_key, http_options={'timeout': self.timeout * 1000})

    def _dict_to_genai_schema(self, schema_dict: dict):
        from google.genai import types
        t = schema_dict.get("type", "string").upper()
        genai_type = getattr(types.Type, t, types.Type.STRING)
        
        properties = None
        if "properties" in schema_dict:
            properties = {
                k: self._dict_to_genai_schema(v) 
                for k, v in schema_dict["properties"].items()
            }
            
        items = None
        if "items" in schema_dict:
            items = self._dict_to_genai_schema(schema_dict["items"])
            
        return types.Schema(
            type=genai_type,
            description=schema_dict.get("description"),
            properties=properties,
            required=schema_dict.get("required"),
            items=items
        )

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
        
        # Build multi-turn few-shot contents
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text="Find the most accurate result for the ASIN: B07P6TWLGS, SKU: Gesl3142P, Title: Geepas Combo Gesl3142P-3Pcs White. And get me the information about the following missing attributes: white_brightness, and number_of_items in a structured format from the allowed list or as per the tool tip.")]
            ),
            types.Content(
                role="model",
                parts=[types.Part.from_text(text='{\n  "white_brightness": "All Purpose",\n  "number_of_items": 3,\n  "white_brightness_sources": ["https://example.com/geepas"]\n}')]
            ),
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

        tools = [types.Tool(google_search=types.GoogleSearch())] if self.enable_web_search else None
        
        config_kwargs = {
            "temperature": self.temperature,
            "top_k": self.top_k,
            "top_p": self.top_p,
            "response_mime_type": "application/json",
            "response_schema": self._dict_to_genai_schema(json_schema)
        }
        
        if tools:
            config_kwargs["tools"] = tools
            
        if "3.5" in self.model or "2.0" in self.model:
            config_kwargs["thinking_config"] = types.ThinkingConfig(include_thoughts=True)
            
        config = types.GenerateContentConfig(**config_kwargs)

        from tenacity import Retrying, stop_after_attempt, wait_exponential, retry_if_not_exception_type

        for attempt in Retrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_not_exception_type(ValueError),
            reraise=True
        ):
            with attempt:
                active_key = key_manager.get_active_key(self.name, self.api_keys)
                if not active_key:
                    raise ValueError(f"[{self.name}] No active API keys available (all on cooldown).")
                    
                client = self._get_client(active_key)
                try:
                    response = client.models.generate_content(
                        model=self.model,
                        contents=contents,
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
                    
                # Extract grounding links if available
                grounding_urls = []
                try:
                    if response.candidates and response.candidates[0].grounding_metadata:
                        gm = response.candidates[0].grounding_metadata
                        if hasattr(gm, "grounding_chunks"):
                            for chunk in gm.grounding_chunks:
                                if hasattr(chunk, "web") and chunk.web and hasattr(chunk.web, "uri"):
                                    grounding_urls.append(chunk.web.uri)
                except Exception as ex:
                    logger.warning(f"[{self.name}] Failed to extract grounding urls: {ex}")
                    
                import json
                # Safely inject grounding urls into the returned JSON so processor.py can pick them up
                if grounding_urls and raw_text:
                    try:
                        parsed_json = json.loads(raw_text)
                        for attr in job.attributes:
                            sources_key = f"{attr}_sources"
                            if sources_key in parsed_json and not parsed_json[sources_key]:
                                parsed_json[sources_key] = grounding_urls
                        raw_text = json.dumps(parsed_json)
                    except:
                        pass
                
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
