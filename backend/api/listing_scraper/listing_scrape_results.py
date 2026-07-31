from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import json
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token

router = APIRouter()


class PushListingScrapeResult(BaseModel):
    asin: str
    scraped_data: Optional[Dict[str, Any]] = None
    status: str = "success"
    error: Optional[str] = None


@router.post("/api/listing-scrape/sessions/{session_id}/results")
def push_result(session_id: str, payload: PushListingScrapeResult, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM listing_scrape_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Session not found")

            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO listing_scrape_results (id, session_id, asin, scraped_data, status, error)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (new_id, session_id, payload.asin,
                 json.dumps(payload.scraped_data) if payload.scraped_data else None,
                 payload.status, payload.error),
            )
            cur.execute(
                "UPDATE listing_scrape_sessions SET completed_asins = completed_asins + 1, updated_at = NOW() WHERE id = %s",
                (session_id,),
            )
            conn.commit()
            return {"result_id": new_id}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
