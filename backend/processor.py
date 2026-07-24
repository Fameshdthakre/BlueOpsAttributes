"""
backend/processor.py
Processes a single ASIN using the configured AI provider and validation engine.
Adapted from the desktop orchestrator.
"""
from __future__ import annotations
import json
import re
from loguru import logger
from backend.models import Job, ValidationEntry, AttributeResult, ProcessingResult
from backend.validation import lookup, fuzzy_match_value
from backend.providers.gemini_provider import GeminiProvider
from backend.providers.openai_provider import OpenAIProvider
from backend.providers.claude_provider import ClaudeProvider

PROVIDERS = {
    "Gemini": GeminiProvider,
    "OpenAI": OpenAIProvider,
    "Claude": ClaudeProvider,
}

def _parse_json(text: str) -> dict:
    """Attempt to extract and parse JSON from a raw LLM response."""
    # Remove markdown code blocks if present
    text = re.sub(r'```(?:json)?\n?(.*?)\n?```', r'\1', text, flags=re.DOTALL)
    
    # Try finding the outermost braces
    start = text.find('{')
    end = text.rfind('}')
    
    if start != -1 and end != -1 and end > start:
        json_str = text[start:end+1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
            
    # Fallback: try parsing the whole thing
    try:
        return json.loads(text)
    except Exception:
        raise ValueError("Could not parse JSON from AI response.")

def process_single_asin(
    job: Job, 
    validation_map_raw: dict[str, list[ValidationEntry]], 
    config: dict
) -> ProcessingResult:
    """
    Process a single ASIN job.
    1. Look up validation rules by product type.
    2. Check primary provider.
    3. Fallback to secondary if primary fails.
    4. Validate extracted values.
    """
    # 1. Build a flat mapping of just the attributes needed for this job
    validation_map: dict[str, ValidationEntry | None] = {
        attr: lookup(validation_map_raw, attr, job.product_type) for attr in job.attributes
    }

    primary_name = config.get("primary_provider", "Gemini")
    fallback_order = config.get("fallback_order", ["OpenAI", "Claude"])
    
    attempts = [primary_name] + [p for p in fallback_order if p != primary_name]
    
    last_error = None
    
    for provider_name in attempts:
        provider_cls = PROVIDERS.get(provider_name)
        if not provider_cls:
            continue
            
        p_cfg = config.get("providers", {}).get(provider_name, {})
        if not p_cfg.get("enabled", True):
            logger.info(f"Skipping {provider_name} (disabled).")
            continue
            
        api_key = p_cfg.get("api_key")
        
        if not api_key:
            logger.warning(f"Skipping {provider_name} (no API key).")
            continue
            
        provider = provider_cls(
            api_key=api_key,
            model=p_cfg.get("model", ""),
            timeout=p_cfg.get("timeout", 60),
            max_retries=p_cfg.get("max_retries", 3),
            enable_web_search=p_cfg.get("enable_web_search", True),
        )
        
        # (Note: Throttling is managed on the frontend via p-limit, 
        # as an in-memory TokenBucket does not work across isolated Vercel serverless functions)
        
        try:
            result = provider.query(job, validation_map)
            parsed_json = _parse_json(result.raw_json)
            
            if not job.title and "_extracted_title" in parsed_json:
                job.title = str(parsed_json["_extracted_title"]).strip()
            
            # Map back to attributes
            attribute_results = []
            for attr_id in job.attributes:
                raw_val = str(parsed_json.get(attr_id, "")).strip()
                val_entry = validation_map.get(attr_id)
                
                # Fetch validation info for export
                val_pt = val_entry.product_type or "" if val_entry else ""
                val_options = ""
                if val_entry:
                    if val_entry.is_validation_list:
                        val_options = "|".join(val_entry.allowed_values)
                    else:
                        val_options = val_entry.tooltip or ""
                
                if not raw_val or raw_val.lower() in ("none", "null", "n/a"):
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value="",
                        final_value="UNRESOLVED",
                        match_status="Unresolved",
                        confidence=0.0,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options
                    ))
                    continue
                    
                if val_entry and val_entry.is_validation_list:
                    final_value, confidence = fuzzy_match_value(raw_val, val_entry.allowed_values)
                    if final_value == "UNRESOLVED":
                        status = "Unresolved"
                    else:
                        status = "Validated"
                else:
                    # Free-text or unknown attribute
                    final_value = raw_val
                    confidence = result.confidence if hasattr(result, 'confidence') else 0.85
                    status = "Free Text"
                
                attribute_results.append(AttributeResult(
                    attribute_id=attr_id,
                    raw_ai_value=raw_val,
                    final_value=final_value,
                    match_status=status,
                    confidence=confidence,
                    validated_product_type=val_pt,
                    validated_allowed_options=val_options
                ))
            
            return ProcessingResult(
                job=job,
                attribute_results=attribute_results,
                provider_used=provider_name,
                error_message=None
            )
            
        except Exception as e:
            last_error = str(e)
            logger.error(f"Provider {provider_name} failed for ASIN {job.asin}: {e}")
            continue # Try next provider
            
    # All providers failed
    return ProcessingResult(
        job=job,
        attribute_results=[],
        provider_used="None",
        error_message=last_error or "All providers failed or missing API keys."
    )
