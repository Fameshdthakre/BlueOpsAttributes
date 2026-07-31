import json
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.auth import verify_token
from backend.config import load_config
from backend.aplus_prompts import GENERATE_CHART, GENERATE_MODULE_CONTENT, STRATEGY_BLOCKS
from backend.aplus_modules import MODULE_REGISTRY

router = APIRouter()

class AIRequest(BaseModel):
    module_id: str
    product_data: Any
    strategy: Optional[str] = "balanced"
    provider: Optional[str] = None # e.g. "Gemini", "OpenAI", "Claude"
    model: Optional[str] = None
    temperature: Optional[float] = 0.7

def _build_field_spec(mod):
    lines = [f"Module: {mod['name']}", "Fields to generate content for:"]
    for f in mod.get("fields", []):
        if f.get("type") == "image": continue
        max_note = f", max {f['maxLength']} chars" if f.get("maxLength") else ""
        type_lbl = "long text" if f.get("type") == "textarea" else "boolean" if f.get("type") == "boolean" else "short text"
        rep_note = f" (generate exactly {f['repeat']} unique items as an array)" if f.get("repeat", 1) > 1 else ""
        lines.append(f'- "{f["key"]}" ({type_lbl}{max_note}): {f["label"]}{rep_note}')
    return "\n".join(lines)

def _call_gemini(prompt: str, config: dict, req: AIRequest):
    from google import genai
    from google.genai import types
    api_key = config["providers"]["Gemini"]["api_key"]
    if not api_key: raise ValueError("Gemini API key is missing")
    
    client = genai.Client(api_key=api_key)
    model = req.model or config["providers"]["Gemini"].get("model", "gemini-2.5-flash")
    
    generation_config = types.GenerateContentConfig(
        temperature=req.temperature,
        response_mime_type="application/json"
    )
    
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=generation_config
    )
    return response.text

def _call_openai(prompt: str, config: dict, req: AIRequest):
    import openai
    api_key = config["providers"]["OpenAI"]["api_key"]
    if not api_key: raise ValueError("OpenAI API key is missing")
    
    client = openai.OpenAI(api_key=api_key)
    model = req.model or config["providers"]["OpenAI"].get("model", "gpt-4o")
    
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=req.temperature,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

def _call_claude(prompt: str, config: dict, req: AIRequest):
    import anthropic
    api_key = config["providers"]["Claude"]["api_key"]
    if not api_key: raise ValueError("Claude API key is missing")
    
    client = anthropic.Anthropic(api_key=api_key)
    model = req.model or config["providers"]["Claude"].get("model", "claude-3-5-sonnet-20241022")
    
    system = "You are a structured data generator. You MUST respond with ONLY a valid JSON object. No introductory text, no explanations, no markdown formatting."
    
    response = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": prompt}],
        temperature=req.temperature,
    )
    return response.content[0].text

@router.post("/api/aplus/ai/generate")
def generate_aplus_ai(req: AIRequest, x_user_id: int = Header(None), x_blueops_token: str = Header(None)):
    user_id = verify_token(x_user_id, x_blueops_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    config = load_config(user_id)
    provider_name = req.provider or config.get("primary_provider", "Gemini")
    
    mod = next((m for m in MODULE_REGISTRY if m["id"] == req.module_id), None)
    if not mod:
        raise HTTPException(status_code=400, detail="Invalid module_id")

    if req.module_id == "module-5":
        strategy_instructions = STRATEGY_BLOCKS.get(req.strategy, STRATEGY_BLOCKS["balanced"])
        prompt = f"{GENERATE_CHART}\n\n{strategy_instructions}\n\nProduct Data:\n\"\"\"\n{json.dumps(req.product_data, indent=2)}\n\"\"\""
        if provider_name == "Claude":
            prompt += "\n\nYou MUST output JSON matching this schema: { 'metrics': [ { 'metricName': 'string', 'values': { '<ASIN>': 'string' } } ], 'shortTitles': { '<ASIN>': 'string' } }"
    else:
        field_spec = _build_field_spec(mod)
        prompt = f"{GENERATE_MODULE_CONTENT}\n\n{field_spec}\n\nProduct Data:\n\"\"\"\n{json.dumps(req.product_data, indent=2)}\n\"\"\""

    try:
        if provider_name == "Gemini":
            result_text = _call_gemini(prompt, config, req)
        elif provider_name == "OpenAI":
            result_text = _call_openai(prompt, config, req)
        elif provider_name == "Claude":
            result_text = _call_claude(prompt, config, req)
        else:
            raise ValueError(f"Unsupported provider: {provider_name}")
            
        # Try to parse the result to ensure it's valid JSON
        # Some providers might wrap it in markdown block
        text = result_text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        text = text.strip()
        
        parsed = json.loads(text)
        return {"data": parsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
