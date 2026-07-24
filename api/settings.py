from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.config import load_config, save_config

app = FastAPI()

class ConfigPayload(BaseModel):
    config: Dict[str, Any]

@app.get("/api/settings")
def get_settings(x_device_id: Optional[str] = Header(default="global")):
    """Load configuration including decrypted API keys."""
    try:
        cfg = load_config(x_device_id)
        return cfg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings")
def update_settings(payload: ConfigPayload, x_device_id: Optional[str] = Header(default="global")):
    """Save configuration (encrypts API keys)."""
    try:
        save_config(payload.config, x_device_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
