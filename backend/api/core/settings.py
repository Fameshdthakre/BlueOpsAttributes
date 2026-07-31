from fastapi import FastAPI, HTTPException, Header, APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.config import load_config, save_config

router = APIRouter()

class ConfigPayload(BaseModel):
    config: Dict[str, Any]

@router.get("/api/settings")
def get_settings(x_user_id: int = Header(...)):
    """Load configuration including decrypted API keys."""
    try:
        cfg = load_config(x_user_id)
        return cfg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/settings")
def update_settings(payload: ConfigPayload, x_user_id: int = Header(...)):
    """Save configuration (encrypts API keys)."""
    try:
        save_config(payload.config, x_user_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
