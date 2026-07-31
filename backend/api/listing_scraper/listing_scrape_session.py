from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from backend.api.core.database import get_connection
from backend.api.core.auth import verify_token

router = APIRouter()


class CreateListingScrapeSession(BaseModel):
    name: str
    marketplace: str = "Amazon.com"
    mode: str = "Scraper"
    total_asins: int = 0


@router.post("/api/listing-scrape/sessions")
def create_session(payload: CreateListingScrapeSession, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO listing_scrape_sessions (id, user_id, name, marketplace, mode, total_asins, status)
                   VALUES (%s, %s, %s, %s, %s, %s, 'pending') RETURNING id""",
                (new_id, user_id, payload.name, payload.marketplace, payload.mode, payload.total_asins),
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


@router.get("/api/listing-scrape/sessions")
def list_sessions(user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, name, marketplace, mode, status, total_asins, completed_asins, created_at
                   FROM listing_scrape_sessions WHERE user_id = %s ORDER BY created_at DESC""",
                (user_id,),
            )
            sessions = []
            for row in cur.fetchall():
                sessions.append({
                    "id": str(row["id"]),
                    "name": row["name"],
                    "marketplace": row["marketplace"],
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


@router.get("/api/listing-scrape/sessions/{session_id}/results")
def get_session_results(session_id: str, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, marketplace, mode, status, total_asins, completed_asins, created_at FROM listing_scrape_sessions WHERE id = %s AND user_id = %s",
                (session_id, user_id),
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            cur.execute(
                "SELECT id, asin, scraped_data, status, error, created_at FROM listing_scrape_results WHERE session_id = %s ORDER BY created_at",
                (session_id,),
            )
            results = []
            for row in cur.fetchall():
                results.append({
                    "id": str(row["id"]),
                    "asin": row["asin"],
                    "scraped_data": row["scraped_data"],
                    "status": row["status"],
                    "error": row["error"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                })

            return {
                "session": {
                    "id": str(session["id"]),
                    "name": session["name"],
                    "marketplace": session["marketplace"],
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


class PatchSession(BaseModel):
    status: Optional[str] = None


@router.patch("/api/listing-scrape/sessions/{session_id}")
def patch_session(session_id: str, payload: PatchSession, user_id: int = Depends(verify_token)):
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE listing_scrape_sessions SET status = COALESCE(%s, status), updated_at = NOW() WHERE id = %s AND user_id = %s",
                (payload.status, session_id, user_id),
            )
            conn.commit()
            return {"success": True}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
