from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from backend.config import load_config, save_config

app = FastAPI()

class ConfigPayload(BaseModel):
    config: Dict[str, Any]

@app.get("/api/settings")
def get_settings():
    """Load configuration including decrypted API keys."""
    try:
        cfg = load_config()
        return cfg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings")
def update_settings(payload: ConfigPayload):
    """Save configuration (encrypts API keys)."""
    try:
        save_config(payload.config)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
