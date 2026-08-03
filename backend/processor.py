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
    
    all_attempts = [primary_name] + [p for p in fallback_order if p != primary_name]
    attempts = []
    for p in all_attempts:
        p_cfg = config.get("providers", {}).get(p, {})
        if p_cfg.get("enabled", True) and p_cfg.get("api_key"):
            attempts.append(p)
            
    if not attempts:
        return ProcessingResult(
            job=job,
            attribute_results=[],
            provider_used="None",
            error_message="Skipping: No AI providers configured."
        )
    
    last_error = None
    
    # --- TAVILY RESEARCH STEP ---
    raw_contexts = []
    tavily_cfg = config.get("providers", {}).get("Tavily", {})
    if tavily_cfg.get("enabled") and tavily_cfg.get("api_key"):
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_cfg.get("api_key"))
            
            attr_details = []
            for attr_id in job.attributes:
                val_entry = validation_map.get(attr_id)
                if val_entry and val_entry.is_validation_list and val_entry.allowed_values:
                    opts = val_entry.allowed_values[:10]
                    opts_str = ", ".join(opts) + (", ..." if len(val_entry.allowed_values) > 10 else "")
                    attr_details.append(f"{attr_id} (Allowed: {opts_str})")
                elif val_entry and val_entry.tooltip:
                    attr_details.append(f"{attr_id} (Info: {val_entry.tooltip})")
                else:
                    attr_details.append(attr_id)
                    
            attr_str = " | ".join(attr_details)
            product_desc = f"{job.asin}; {job.title or job.brand or ''}"
            search_query = f'Find detailed specifications and missing attributes for product: {product_desc}.\nTarget attributes to find: {attr_str}'
            urls = []
            
            tavily_fmt = tavily_cfg.get("tavily_format", "markdown")
            
            if job.custom_urls:
                for cu in job.custom_urls:
                    if cu and cu not in urls:
                        urls.append(cu)
            
            if tavily_cfg.get("enable_search", True):
                logger.info(f"[Tavily] Deep researching ASIN {job.asin}...")
                response = client.search(
                    query=search_query,
                    include_answer="advanced",
                    search_depth=tavily_cfg.get("search_depth", "advanced"),
                    include_raw_content=tavily_fmt,
                    chunks_per_source=4,
                    max_results=tavily_cfg.get("max_results", 5)
                )
                
                answer = response.get("answer")
                if answer:
                    raw_contexts.append(f"TAVILY DIRECT ANSWER:\n{answer}")
                
                for res in response.get("results", []):
                    url = res.get("url")
                    if url and url not in urls:
                        urls.append(url)
                    content = res.get("raw_content") or res.get("content")
                    if content:
                        raw_contexts.append(f"Source: {url}\nTitle: {res.get('title', '')}\n{content}")

            if urls and tavily_cfg.get("enable_extract", True):
                try:
                    logger.info(f"[Tavily] Performing deep URL extraction on {len(urls[:3])} sources...")
                    extract_res = client.extract(
                        urls=urls[:3],
                        query=search_query,
                        chunks_per_source=4,
                        extract_depth=tavily_cfg.get("extract_depth", "advanced"),
                        format=tavily_fmt
                    )
                    for ext in extract_res.get("results", []):
                        raw_ext = ext.get("raw_content")
                        if raw_ext:
                            raw_contexts.append(f"Extracted Deep Content ({ext.get('url')}):\n{raw_ext}")
                except Exception as ext_err:
                    logger.warning(f"[Tavily] URL extraction skipped/failed: {ext_err}")
            
            logger.info(f"[Tavily] Gathered {len(raw_contexts)} context blocks for {job.asin}.")
        except Exception as e:
            logger.error(f"[Tavily] Search failed for {job.asin}: {e}")
    # ----------------------------
    
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
            temperature=p_cfg.get("temperature", 0.1),
            top_k=p_cfg.get("top_k", 40),
            top_p=p_cfg.get("top_p", 0.95),
        )
        
        # Assemble smart context fitting the provider's token limit
        max_tokens = p_cfg.get("max_context_tokens", 8000)
        research_context = None
        if raw_contexts:
            current_tokens = 0
            selected_contexts = []
            for ctx in raw_contexts:
                est_tokens = len(ctx) // 4
                if current_tokens + est_tokens > max_tokens:
                    break
                selected_contexts.append(ctx)
                current_tokens += est_tokens
            if selected_contexts:
                research_context = "\n\n---\n\n".join(selected_contexts)
        
        try:
            result = provider.query(job, validation_map, research_context)
            
            logger.info(
                f"[{provider_name}] Sent Prompt for ASIN {job.asin}:\n{result.prompt_sent}\n"
                f"[{provider_name}] Received Response for ASIN {job.asin}:\n{result.raw_json}\n"
                f"{'-'*60}"
            )
            
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
            
            # Fast fail if the error implies a fundamental issue (like schema or token limit)
            lower_err = last_error.lower()
            if "400" in lower_err or "schema" in lower_err or "context" in lower_err or "token limit" in lower_err:
                logger.error(f"Fundamental error encountered ({provider_name}). Aborting fallback loop.")
                break
                
            continue # Try next provider
            
    # All providers failed
    return ProcessingResult(
        job=job,
        attribute_results=[],
        provider_used="None",
        error_message=last_error or "All providers failed or missing API keys."
    )
