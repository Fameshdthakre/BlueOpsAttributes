"""
backend/auth.py
Middleware and helpers for dual-authentication (NextAuth and API Tokens).
"""
import hashlib
from fastapi import Header, HTTPException
from typing import Optional
from backend.database import get_connection

def verify_token(
    x_user_id: Optional[str] = Header(None),
    x_blueops_token: Optional[str] = Header(None)
) -> int:
    """
    FastAPI dependency for dual-authentication.
    Supports either NextAuth 'x-user-id' header or 'X-BlueOps-Token' API token.
    Returns the user_id (int) if valid, or raises HTTPException 401.
    """
    # 1. Try NextAuth header first (Webapp)
    if x_user_id and x_user_id.isdigit():
        return int(x_user_id)
        
    # 2. Try API Token (Extensions)
    if x_blueops_token:
        token_hash = hashlib.sha256(x_blueops_token.encode('utf-8')).hexdigest()
        
        conn = None
        try:
            conn = get_connection()
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT user_id FROM api_tokens WHERE token_hash = %s", 
                    (token_hash,)
                )
                row = cur.fetchone()
                if row:
                    user_id = row['user_id']
                    # Update last used timestamp
                    cur.execute(
                        "UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = %s",
                        (token_hash,)
                    )
                    conn.commit()
                    return user_id
        except Exception as e:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            if conn:
                conn.close()
                
    raise HTTPException(status_code=401, detail="Unauthorized")
