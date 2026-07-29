from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from backend.providers.gemini_provider import GeminiProvider
from backend.providers.openai_provider import OpenAIProvider
from backend.providers.claude_provider import ClaudeProvider
from backend.config import load_config

app = FastAPI()

class TestConnectionRequest(BaseModel):
    provider_name: str
    api_key: str
    model: str

PROVIDERS = {
    "Gemini": GeminiProvider,
    "OpenAI": OpenAIProvider,
    "Claude": ClaudeProvider,
}

@app.post("/api/test_connection")
def test_connection(req: TestConnectionRequest, x_user_id: int = Header(...)):
    """Test AI provider connection."""
    config = load_config(x_user_id)
    provider_cls = PROVIDERS.get(req.provider_name)
    if not provider_cls:
        raise HTTPException(status_code=400, detail="Unknown provider")
        
    try:
        provider = provider_cls(
            api_key=req.api_key,
            model=req.model,
            timeout=10,
            max_retries=1
        )
        ok, msg = provider.test_connection()
        return {"ok": ok, "message": msg}
    except Exception as e:
        return {"ok": False, "message": str(e)}
