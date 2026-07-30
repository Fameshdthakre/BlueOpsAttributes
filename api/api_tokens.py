from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
import secrets
import hashlib
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()

@router.get("/api/tokens")
def get_tokens(user_id: int = Depends(verify_token)):
    """Get current user's API token info."""
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, label, last_used_at, last_used_tool, created_at FROM api_tokens WHERE user_id = %s ORDER BY created_at DESC", 
                (user_id,)
            )
            tokens = []
            for row in cur.fetchall():
                tokens.append({
                    "id": str(row["id"]),
                    "label": row["label"],
                    "last_used_at": row["last_used_at"].isoformat() if row["last_used_at"] else None,
                    "last_used_tool": row["last_used_tool"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None
                })
            return {"tokens": tokens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

class RegenerateRequest(BaseModel):
    label: str = "Default Token"

@router.post("/api/tokens/regenerate")
def regenerate_token(payload: RegenerateRequest, user_id: int = Depends(verify_token)):
    """Generate a new API token, invalidating the old one(s) for this user."""
    # Generate a secure 32-byte hex token
    plain_token = "blueops_" + secrets.token_hex(32)
    token_hash = hashlib.sha256(plain_token.encode('utf-8')).hexdigest()
    
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Delete old tokens for this user to ensure 1 token per user
            cur.execute("DELETE FROM api_tokens WHERE user_id = %s", (user_id,))
            
            # Insert the new token hash
            cur.execute(
                "INSERT INTO api_tokens (user_id, token_hash, label) VALUES (%s, %s, %s) RETURNING id",
                (user_id, token_hash, payload.label)
            )
            new_id = cur.fetchone()["id"]
            conn.commit()
            
            return {
                "success": True,
                "token": plain_token,  # Only shown once!
                "id": str(new_id)
            }
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

app = FastAPI()
app.include_router(router)
