from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()


class CreateImageAuditSession(BaseModel):
    name: str
    portal: str = "vendor"
    domain: str = "com"
    mode: str = "Audit"
    total_asins: int = 0


@router.post("/api/image-audit/sessions")
def create_session(payload: CreateImageAuditSession, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO image_audit_sessions (id, user_id, name, portal, domain, mode, total_asins, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending') RETURNING id""",
                (new_id, user_id, payload.name, payload.portal, payload.domain, payload.mode, payload.total_asins),
            )
            session_id = cur.fetchone()["id"]
            conn.commit()
            return {"session_id": str(session_id)}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/image-audit/sessions")
def list_sessions(user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, portal, domain, mode, status, total_asins, completed_asins, created_at
                   FROM image_audit_sessions WHERE user_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            sessions = []
            for row in cur.fetchall():
                sessions.append({
                    "id": str(row["id"]),
                    "name": row["name"],
                    "portal": row["portal"],
                    "domain": row["domain"],
                    "mode": row["mode"],
                    "status": row["status"],
                    "total_asins": row["total_asins"],
                    "completed_asins": row["completed_asins"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                })
            return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/image-audit/sessions/{session_id}/results")
def get_session_results(session_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, portal, domain, mode, status, total_asins, completed_asins, created_at FROM image_audit_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            cur.execute(
                "SELECT id, asin, match_status, portal_images, pdp_images, similarity_scores, report, created_at FROM image_audit_results WHERE session_id = %s ORDER BY created_at",
                (session_id,),
            )
            results = []
            for row in cur.fetchall():
                results.append({
                    "id": str(row["id"]),
                    "asin": row["asin"],
                    "match_status": row["match_status"],
                    "portal_images": row["portal_images"],
                    "pdp_images": row["pdp_images"],
                    "similarity_scores": row["similarity_scores"],
                    "report": row["report"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                })
            return {
                "session": {
                    "id": str(session["id"]),
                    "name": session["name"],
                    "portal": session["portal"],
                    "domain": session["domain"],
                    "mode": session["mode"],
                    "status": session["status"],
                    "total_asins": session["total_asins"],
                    "completed_asins": session["completed_asins"],
                    "created_at": session["created_at"].isoformat() if session["created_at"] else None,
                },
                "results": results,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()



