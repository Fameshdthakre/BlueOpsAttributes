from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid
from backend.database import get_connection
from backend.auth import verify_token

router = APIRouter()


class AddJob(BaseModel):
    draft_url: Optional[str] = None
    content_title: Optional[str] = None
    modules: Optional[List[str]] = None


class UpdateJobStatus(BaseModel):
    status: str
    error: Optional[str] = None


@router.post("/api/aplus/sessions/{session_id}/jobs")
def add_job(session_id: str, payload: AddJob, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO aplus_jobs (id, session_id, draft_url, content_title, modules, status)
                   VALUES (%s, %s, %s, %s, %s, 'pending') RETURNING id""",
                (new_id, session_id, payload.draft_url, payload.content_title,
                 payload.modules if payload.modules else None),
            )
            job_id = cur.fetchone()["id"]

            # Update session total_drafts
            cur.execute(
                "UPDATE aplus_sessions SET total_drafts = total_drafts + 1, updated_at = NOW() WHERE id = %s",
                (session_id,),
            )
            conn.commit()
            return {"job_id": str(job_id)}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.patch("/api/aplus/jobs/{job_id}")
def update_job_status(job_id: str, payload: UpdateJobStatus, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            if payload.status == "completed":
                cur.execute(
                    """UPDATE aplus_jobs SET status = %s, error = %s, completed_at = NOW()
                       WHERE id = %s RETURNING session_id""",
                    (payload.status, payload.error, job_id),
                )
            else:
                cur.execute(
                    "UPDATE aplus_jobs SET status = %s, error = %s WHERE id = %s RETURNING session_id",
                    (payload.status, payload.error, job_id),
                )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Job not found")

            session_id = row["session_id"]
            if payload.status == "completed":
                cur.execute(
                    "UPDATE aplus_sessions SET completed_drafts = completed_drafts + 1, updated_at = NOW() WHERE id = %s",
                    (session_id,),
                )

            # Check if all jobs done
            cur.execute(
                "SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as done FROM aplus_jobs WHERE session_id = %s",
                (session_id,),
            )
            counts = cur.fetchone()
            if counts["total"] > 0 and counts["total"] == counts["done"]:
                cur.execute(
                    "UPDATE aplus_sessions SET status = 'completed', updated_at = NOW() WHERE id = %s",
                    (session_id,),
                )

            conn.commit()
            return {"success": True}
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
