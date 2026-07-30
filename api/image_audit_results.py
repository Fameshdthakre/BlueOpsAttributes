from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()


class PushImageResult(BaseModel):
    asin: str
    match_status: Optional[str] = None
    portal_images: Optional[List[str]] = None
    pdp_images: Optional[List[str]] = None
    similarity_scores: Optional[Dict[str, Any]] = None
    report: Optional[Dict[str, Any]] = None


@router.post("/api/image-audit/sessions/{session_id}/results")
def push_result(session_id: str, payload: PushImageResult, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # Verify session belongs to user
            cur.execute(
                "SELECT id FROM image_audit_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Session not found")

            import json
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO image_audit_results
                   (id, session_id, asin, match_status, portal_images, pdp_images, similarity_scores, report)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    new_id, session_id, payload.asin, payload.match_status,
                    json.dumps(payload.portal_images) if payload.portal_images else None,
                    json.dumps(payload.pdp_images) if payload.pdp_images else None,
                    json.dumps(payload.similarity_scores) if payload.similarity_scores else None,
                    json.dumps(payload.report) if payload.report else None,
                ),
            )
            # Increment completed_asins counter
            cur.execute(
                "UPDATE image_audit_sessions SET completed_asins = completed_asins + 1, updated_at = NOW() WHERE id = %s",
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


app = FastAPI()
app.include_router(router)
