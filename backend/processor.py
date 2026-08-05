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

def build_tavily_research_schema(job: Job, validation_map: dict[str, ValidationEntry | None]) -> dict:
    properties = {}
    required = []
    
    for attr in job.attributes:
        val_entry = validation_map.get(attr)
        desc = f"Provide the most accurate value for {attr}."
        if val_entry:
            if val_entry.is_validation_list:
                desc = f"Strictly one word from the following Allowed List: {', '.join(val_entry.allowed_values)}"
            elif val_entry.tooltip:
                desc = f"Value Criteria Tooltip: {val_entry.tooltip}"
                
        properties[attr] = {
            "type": "string",
            "description": desc
        }
        required.append(attr)
        
    if not job.title:
        properties["_extracted_title"] = {
            "type": "string",
            "description": "The exact full title of the product."
        }
        
    return {
        "type": "object",
        "properties": properties,
        "required": required
    }

async def execute_tavily_research(job: Job, validation_map: dict[str, ValidationEntry | None], tavily_cfg: dict, tavily_keys: list[str]) -> ProcessingResult | None:
    from tavily import AsyncTavilyClient
    from backend.key_manager import key_manager
    import asyncio
    
    research_model = tavily_cfg.get("research_model", "mini")
    research_output_length = tavily_cfg.get("research_output_length", "short")
    
    schema = build_tavily_research_schema(job, validation_map)
    product_desc = f"ASIN: {job.asin}"
    if job.title: product_desc += f", Title: {job.title}"
    if job.brand: product_desc += f", Brand: {job.brand}"
    input_prompt = f"Find the most accurate result for product: {product_desc}. Get information for missing attributes: {', '.join(job.attributes)}."

    import urllib.parse
    research_kwargs = {}
    if job.custom_urls:
        domains = []
        for url in job.custom_urls:
            try:
                parsed_uri = urllib.parse.urlparse(url)
                domain = '{uri.netloc}'.format(uri=parsed_uri)
                if domain:
                    if domain.startswith("www."):
                        domain = domain[4:]
                    if domain not in domains:
                        domains.append(domain)
            except Exception:
                pass
        if domains:
            research_kwargs["include_domains"] = domains

    for attempt in range(len(tavily_keys)):
        tavily_key = key_manager.get_active_key("Tavily", tavily_keys)
        if not tavily_key:
            logger.warning(f"[Tavily Research] No active API keys available for ASIN {job.asin}.")
            break
            
        client = AsyncTavilyClient(api_key=tavily_key)
        try:
            logger.info(f"[Tavily Research] Launching research for {job.asin}...")
            response = await asyncio.wait_for(
                client.research(
                    input=input_prompt, 
                    model=research_model, 
                    output_schema=schema,
                    output_length=research_output_length,
                    **research_kwargs
                ), timeout=180.0
            )
            
            logger.info(f"[Tavily Research] Received response for ASIN {job.asin}:\n{json.dumps(response, indent=2) if isinstance(response, dict) else str(response)}\n{'-'*60}")
            
            gathered_urls = []
            if isinstance(response, dict):
                if "sources" in response and isinstance(response["sources"], list):
                    for src in response["sources"]:
                        if isinstance(src, dict) and "url" in src:
                            gathered_urls.append(src["url"])
                        elif isinstance(src, str) and src.startswith("http"):
                            gathered_urls.append(src)
                if "results" in response and isinstance(response["results"], list):
                    for res in response["results"]:
                        if isinstance(res, dict) and "url" in res:
                            gathered_urls.append(res["url"])
            if gathered_urls:
                job.extra_data["searched_urls"] = gathered_urls

            if isinstance(response, dict):
                if "answer" in response and isinstance(response["answer"], str):
                    parsed_json = _parse_json(response["answer"])
                else:
                    parsed_json = _parse_json(json.dumps(response))
            else:
                parsed_json = _parse_json(str(response))
            
            if not job.title and "_extracted_title" in parsed_json:
                job.title = str(parsed_json["_extracted_title"]).strip()
            
            # Map back to attributes
            attribute_results = []
            for attr_id in job.attributes:
                raw_val = str(parsed_json.get(attr_id, "")).strip()
                val_entry = validation_map.get(attr_id)
                val_pt = val_entry.product_type or "" if val_entry else ""
                val_options = ""
                if val_entry:
                    if val_entry.is_validation_list:
                        val_options = "|".join(val_entry.allowed_values)
                    else:
                        val_options = val_entry.tooltip or ""
                
                if not raw_val or raw_val.lower() in ("none", "null", "n/a", "unresolved"):
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value="",
                        final_value="UNRESOLVED",
                        match_status="Unresolved",
                        confidence=0.0,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options,
                        source_links=gathered_urls
                    ))
                    continue
                    
                if val_entry and val_entry.is_validation_list:
                    final_value, confidence = fuzzy_match_value(raw_val, val_entry.allowed_values)
                    status = "Unresolved" if final_value == "UNRESOLVED" else "Validated"
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value=raw_val,
                        final_value=final_value,
                        match_status=status,
                        confidence=confidence,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options,
                        source_links=gathered_urls
                    ))
                else:
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value=raw_val,
                        final_value=raw_val,
                        match_status="Free Text",
                        confidence=0.85,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options,
                        source_links=gathered_urls
                    ))
            
            return ProcessingResult(
                job=job,
                attribute_results=attribute_results,
                provider_used="Tavily Research",
                error_message=None,
                input_tokens=0,
                output_tokens=0,
                tavily_used=True,
                tavily_credits=1
            )
            
        except Exception as e:
            err_str = str(e).lower()
            if any(k in err_str for k in ["429", "quota", "rate limit", "unauthorized", "401", "403", "limit exceeded"]):
                logger.warning(f"[Tavily Research] Key failed with quota/auth error: {e}. Rotating key...")
                key_manager.mark_key_exhausted("Tavily", tavily_key, tavily_keys)
                continue
            else:
                logger.warning(f"[Tavily Research] Research failed: {e}")
                break

    return None

async def process_single_asin(
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
    if tavily_cfg.get("enabled"):
        tavily_keys = tavily_cfg.get("api_keys", [])
        if not tavily_keys and tavily_cfg.get("api_key"):
            tavily_keys = [tavily_cfg.get("api_key")]
            
        if tavily_keys:
            if tavily_cfg.get("enable_research"):
                research_res = await execute_tavily_research(job, validation_map, tavily_cfg, tavily_keys)
                if research_res:
                    return research_res
                elif tavily_cfg.get("research_fallback"):
                    logger.info(f"[Tavily Research] Falling back to standard LLM processing for {job.asin}...")
                else:
                    logger.error(f"[Tavily Research] Failed and fallback is disabled for {job.asin}.")
                    return ProcessingResult(
                        job=job,
                        attribute_results=[],
                        provider_used="Tavily Research",
                        error_message="Tavily Research failed and fallback is disabled.",
                        tavily_used=True,
                        tavily_credits=0
                    )
            try:
                from tavily import AsyncTavilyClient
                from backend.key_manager import key_manager
                import asyncio
                
                tavily_fmt = tavily_cfg.get("tavily_format", "markdown")
                product_desc = f"{job.asin}; {job.title or job.brand or ''}"
                gathered_urls = []
                tavily_credits_used = 0
                if job.custom_urls:
                    for cu in job.custom_urls:
                        if cu and cu not in gathered_urls:
                            gathered_urls.append(cu)

                for attempt in range(len(tavily_keys)):
                    tavily_key = key_manager.get_active_key("Tavily", tavily_keys)
                    if not tavily_key:
                        logger.warning(f"[Tavily] No active API keys available for ASIN {job.asin}.")
                        break
                        
                    client = AsyncTavilyClient(api_key=tavily_key)
                    try:
                        # 1. Custom URL extraction
                        if job.custom_urls and tavily_cfg.get("enable_extract", True):
                            try:
                                logger.info(f"[Tavily] Extracting {len(job.custom_urls)} custom URLs for {job.asin}...")
                                extract_kwargs = {
                                    "urls": job.custom_urls[:3],
                                    "format": tavily_fmt
                                }
                                ext_depth = tavily_cfg.get("extract_depth", "basic")
                                if ext_depth == "advanced":
                                    extract_kwargs["extract_depth"] = "advanced"

                                extract_res = await asyncio.wait_for(
                                    client.extract(**extract_kwargs),
                                    timeout=45.0
                                )
                                tavily_credits_used += len(extract_kwargs["urls"]) * (2 if ext_depth == "advanced" else 1)
                                for ext in extract_res.get("results", []):
                                    if ext.get("raw_content"):
                                        content = ext.get('raw_content')[:3000]
                                        raw_contexts.append(f"[GENERAL] Extracted Custom URL ({ext.get('url')}):\n{content}")
                            except Exception as ext_err:
                                logger.warning(f"[Tavily] Custom URL extraction failed: {ext_err}")

                        # 2. Consolidated Attribute Search
                        if tavily_cfg.get("enable_search", True) and job.attributes:
                            logger.info(f"[Tavily] Launching ONE consolidated search for {len(job.attributes)} attributes on ASIN {job.asin}...")
                            attributes_list = ", ".join(job.attributes)
                            search_query = f'Find exact specifications for product: {product_desc}. Looking for: {attributes_list}'
                            
                            search_depth = tavily_cfg.get("search_depth", "basic")
                            response = await asyncio.wait_for(
                                client.search(
                                    query=search_query,
                                    include_answer=False,
                                    search_depth=search_depth,
                                    include_raw_content=True,
                                    max_results=tavily_cfg.get("max_results", 5)
                                ),
                                timeout=45.0
                            )
                            tavily_credits_used += 2 if search_depth == "advanced" else 1
                            
                            ctxs = []
                            for res in response.get("results", []):
                                if res.get("url"):
                                    if res.get("url") not in gathered_urls:
                                        gathered_urls.append(res.get("url"))
                                        
                                content = res.get("raw_content") or res.get("content")
                                if content:
                                    truncated_content = content[:3000]
                                    ctxs.append(f"Source: {res.get('url')}\n{truncated_content}")
                                    
                            if ctxs:
                                raw_contexts.append("\n---\n".join(ctxs))
                        
                        # Break out of key loop on success!
                        break
                        
                    except Exception as e:
                        err_str = str(e).lower()
                        if any(k in err_str for k in ["429", "quota", "rate limit", "unauthorized", "401", "403", "limit exceeded"]):
                            logger.warning(f"[Tavily] Key failed with quota/auth error: {e}. Rotating key...")
                            key_manager.mark_key_exhausted("Tavily", tavily_key, tavily_keys)
                            continue # Try next key in loop
                        else:
                            logger.warning(f"[Tavily] Search failed with non-quota error: {e}")
                            break # Standard error, do not burn other keys

                if gathered_urls:
                    job.extra_data["searched_urls"] = gathered_urls
                            
                logger.info(f"[Tavily] Gathered {len(raw_contexts)} context blocks and {len(gathered_urls)} URLs for {job.asin}.")
            except Exception as e:
                logger.error(f"[Tavily] Fatal search failure for {job.asin}: {e}")
    # ----------------------------
    # ----------------------------
    
    for provider_name in attempts:
        provider_cls = PROVIDERS.get(provider_name)
        if not provider_cls:
            continue
            
        p_cfg = config.get("providers", {}).get(provider_name, {})
        if not p_cfg.get("enabled", True):
            logger.info(f"Skipping {provider_name} (disabled).")
            continue
            
        api_keys = p_cfg.get("api_keys", [])
        
        if not api_keys:
            logger.warning(f"Skipping {provider_name} (no API keys).")
            continue
            
        provider = provider_cls(
            api_keys=api_keys,
            model=p_cfg.get("model", ""),
            timeout=p_cfg.get("timeout", 60),
            max_retries=p_cfg.get("max_retries", 3),
            enable_web_search=p_cfg.get("enable_web_search", True),
            temperature=p_cfg.get("temperature", 0.1),
            top_k=p_cfg.get("top_k", 40),
            top_p=p_cfg.get("top_p", 0.95),
        )
        
        # Assemble smart context fitting the provider's token limit
        max_tokens = p_cfg.get("max_context_tokens", 25000)
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
        
        # 1. Mutual Exclusion: If Tavily research context was gathered, disable native LLM web search
        if research_context:
            provider.enable_web_search = False

        # 2. RPM Rate Limiting: Acquire token slot for this provider
        try:
            from backend.rate_limiter import get_rate_limiter
            rpm = p_cfg.get("rpm_limit", 60)
            limiter = await get_rate_limiter(f"provider:{provider_name}", rpm)
            await limiter.acquire()
        except Exception as lim_err:
            logger.warning(f"Rate limiter error for {provider_name}: {lim_err}")

        try:
            import asyncio
            result = await asyncio.wait_for(
                asyncio.to_thread(provider.query, job, validation_map, research_context),
                timeout=p_cfg.get("timeout", 60) + 5  # Give the internal timeout 5 seconds buffer
            )
            
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
                
                if not raw_val or raw_val.lower() in ("none", "null", "n/a", "unresolved"):
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value="",
                        final_value="UNRESOLVED",
                        match_status="Unresolved",
                        confidence=0.0,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options,
                        source_links=[]
                    ))
                    continue
                    
                if val_entry and val_entry.is_validation_list:
                    final_value, confidence = fuzzy_match_value(raw_val, val_entry.allowed_values)
                    if final_value == "UNRESOLVED":
                        status = "Unresolved"
                    else:
                        status = "Validated"
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value=raw_val,
                        final_value=final_value,
                        match_status=status,
                        confidence=confidence,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options,
                        source_links=[]
                    ))
                else:
                    # Free-text or unknown attribute
                    attribute_results.append(AttributeResult(
                        attribute_id=attr_id,
                        raw_ai_value=raw_val,
                        final_value=raw_val,
                        match_status="Free Text",
                        confidence=result.confidence if hasattr(result, 'confidence') else 0.85,
                        validated_product_type=val_pt,
                        validated_allowed_options=val_options,
                        source_links=[]
                    ))
            
            return ProcessingResult(
                job=job,
                attribute_results=attribute_results,
                provider_used=provider_name,
                error_message=None,
                input_tokens=result.input_tokens if hasattr(result, 'input_tokens') else 0,
                output_tokens=result.output_tokens if hasattr(result, 'output_tokens') else 0,
                tavily_used=bool(raw_contexts),
                tavily_credits=tavily_credits_used if 'tavily_credits_used' in locals() else 0
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
    failed_results = []
    for attr_id in job.attributes:
        val_entry = validation_map.get(attr_id)
        val_pt = val_entry.product_type or "" if val_entry else ""
        val_options = ""
        if val_entry:
            if val_entry.is_validation_list:
                val_options = "|".join(val_entry.allowed_values)
            else:
                val_options = val_entry.tooltip or ""
                
        failed_results.append(AttributeResult(
            attribute_id=attr_id,
            raw_ai_value="",
            final_value="FAILED",
            match_status="Failed",
            confidence=0.0,
            validated_product_type=val_pt,
            validated_allowed_options=val_options
        ))

    return ProcessingResult(
        job=job,
        attribute_results=failed_results,
        provider_used="None",
        error_message=last_error or "All providers failed or missing API keys.",
        tavily_used=bool(raw_contexts),
        tavily_credits=tavily_credits_used
    )
