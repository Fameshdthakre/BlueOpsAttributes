"""
backend/config.py
Config management with Vercel Postgres and Fernet.
"""
from __future__ import annotations
import json
import os
from typing import Any
from cryptography.fernet import Fernet
from loguru import logger
from dotenv import load_dotenv

from backend.database import get_connection

load_dotenv()

# The encryption key MUST be stored as an environment variable in Vercel.
# e.g., ENCRYPTION_KEY="your-base64-fernet-key="
def _fernet() -> Fernet:
    key_str = os.environ.get("ENCRYPTION_KEY")
    if not key_str:
        # Fallback for local development if not set, but not recommended for prod.
        logger.warning("ENCRYPTION_KEY not found in environment, generating a volatile one.")
        key_str = Fernet.generate_key().decode("utf-8")
        os.environ["ENCRYPTION_KEY"] = key_str
    return Fernet(key_str.encode("utf-8"))


DEFAULT_CONFIG: dict[str, Any] = {
    "primary_provider": "Gemini",
    "fallback_order": ["OpenAI", "Claude"],
    "custom_models": {
        "Gemini": [],
        "OpenAI": [],
        "Claude": [],
    },
    "providers": {
        "Gemini": {
            "enabled": True,
            "api_key": "",
            "model": "gemini-2.5-flash",
            "max_retries": 3,
            "timeout": 60,
            "rpm_limit": 15,
            "temperature": 0.1,
            "top_k": 40,
            "top_p": 0.95,
            "enable_web_search": True,
        },
        "OpenAI": {
            "enabled": True,
            "api_key": "",
            "model": "gpt-4o-2024-08-06",
            "max_retries": 3,
            "timeout": 60,
            "rpm_limit": 20,
            "temperature": 0.1,
            "top_k": 40,
            "top_p": 0.95,
            "enable_web_search": True,
        },
        "Claude": {
            "enabled": True,
            "api_key": "",
            "model": "claude-haiku-4-5",
            "max_retries": 3,
            "timeout": 60,
            "rpm_limit": 10,
            "temperature": 0.1,
            "top_k": 40,
            "top_p": 0.95,
            "enable_web_search": True,
        },
    },
}

def load_config() -> dict[str, Any]:
    cfg = _deep_copy(DEFAULT_CONFIG)
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # 1. Load global settings JSON
            cur.execute("SELECT value FROM settings WHERE key = 'global_config'")
            row = cur.fetchone()
            if row:
                db_cfg = json.loads(row["value"])
                cfg = _merge_defaults(db_cfg, cfg)
            
            # 2. Load API keys
            f = _fernet()
            cur.execute("SELECT provider, encrypted_key FROM api_keys")
            for p_row in cur.fetchall():
                provider = p_row["provider"]
                if provider in cfg["providers"] and p_row["encrypted_key"]:
                    try:
                        plaintext_key = f.decrypt(bytes(p_row["encrypted_key"])).decode('utf-8')
                        cfg["providers"][provider]["api_key"] = plaintext_key
                    except Exception as e:
                        logger.error(f"Failed to decrypt API key for {provider}: {e}")

            # 3. Load Custom Models
            cur.execute("SELECT provider, model_name FROM custom_models")
            for cm_row in cur.fetchall():
                provider = cm_row["provider"]
                model = cm_row["model_name"]
                if provider in cfg["custom_models"]:
                    if model not in cfg["custom_models"][provider]:
                        cfg["custom_models"][provider].append(model)
                        
        return cfg
    except Exception as exc:
        logger.warning(f"Error loading config from DB ({exc}) — using defaults.")
        return _deep_copy(DEFAULT_CONFIG)
    finally:
        if conn:
            conn.close()

def save_config(cfg: dict[str, Any]) -> None:
    conn = None
    try:
        conn = get_connection()
        f = _fernet()
        with conn.cursor() as cur:
            # 1. Save API keys
            cfg_copy = _deep_copy(cfg)
            for provider, p_data in cfg_copy.get("providers", {}).items():
                api_key = p_data.pop("api_key", "")
                if api_key:
                    encrypted_key = f.encrypt(api_key.encode('utf-8'))
                    cur.execute(
                        "INSERT INTO api_keys (provider, encrypted_key) VALUES (%s, %s) ON CONFLICT (provider) DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key", 
                        (provider, encrypted_key)
                    )
                else:
                    cur.execute("DELETE FROM api_keys WHERE provider = %s", (provider,))

            # 2. Save Custom Models
            custom_models = cfg_copy.pop("custom_models", {})
            cur.execute("TRUNCATE TABLE custom_models")
            for provider, models in custom_models.items():
                for m in models:
                    cur.execute(
                        "INSERT INTO custom_models (provider, model_name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (provider, m)
                    )
            
            # 3. Save global config
            config_json = json.dumps(cfg_copy)
            cur.execute(
                "INSERT INTO settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", 
                ("global_config", config_json)
            )

        conn.commit()
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.error(f"Failed to save configuration to DB: {exc}")
    finally:
        if conn:
            conn.close()

def get_provider_config(cfg: dict, provider_name: str) -> dict:
    return cfg.get("providers", {}).get(provider_name, {})

def _deep_copy(d: dict) -> dict:
    return json.loads(json.dumps(d))

def _merge_defaults(target: dict, defaults: dict) -> dict:
    for key, val in defaults.items():
        if key not in target:
            target[key] = _deep_copy(val) if isinstance(val, dict) else val
        elif isinstance(val, dict) and isinstance(target.get(key), dict):
            target[key] = _merge_defaults(target[key], val)
    return target
