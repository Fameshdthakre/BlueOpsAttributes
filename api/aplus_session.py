from fastapi import FastAPI, APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
import uuid
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()


class CreateAplusSession(BaseModel):
    name: str
    portal: str = "vendor"
    domain: str = "com"


@router.post("/api/aplus/sessions")
def create_session(payload: CreateAplusSession, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO aplus_sessions (id, user_id, name, portal, domain, status)
                   VALUES (%s, %s, %s, %s, %s, 'pending') RETURNING id""",
                (new_id, user_id, payload.name, payload.portal, payload.domain),
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


@router.get("/api/aplus/sessions")
def list_sessions(user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, portal, domain, status, total_drafts, completed_drafts, created_at, updated_at
                   FROM aplus_sessions WHERE user_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            sessions = []
            for row in cur.fetchall():
                sessions.append({
                    "id": str(row["id"]),
                    "name": row["name"],
                    "portal": row["portal"],
                    "domain": row["domain"],
                    "status": row["status"],
                    "total_drafts": row["total_drafts"],
                    "completed_drafts": row["completed_drafts"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                })
            return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/api/aplus/sessions/{session_id}/jobs")
def get_session_jobs(session_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, portal, domain, status, total_drafts, completed_drafts, created_at FROM aplus_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            cur.execute(
                "SELECT id, draft_url, content_title, modules, status, error, completed_at, created_at FROM aplus_jobs WHERE session_id = %s ORDER BY created_at",
                (session_id,),
            )
            jobs = []
            for row in cur.fetchall():
                jobs.append({
                    "id": str(row["id"]),
                    "draft_url": row["draft_url"],
                    "content_title": row["content_title"],
                    "modules": row["modules"],
                    "status": row["status"],
                    "error": row["error"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                })
            return {
                "session": dict(session),
                "jobs": jobs
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


app = FastAPI()
app.include_router(router)
