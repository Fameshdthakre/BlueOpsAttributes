import uuid
from fastapi import FastAPI, HTTPException, Header, APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.database import get_connection

router = APIRouter()

class CreateSessionRequest(BaseModel):
    input_file: str

@router.post("/api/session")
def create_session(req: CreateSessionRequest, x_user_id: int = Header(...)):
    """Create a new batch processing session."""
    session_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sessions (session_id, user_id, input_file, status) VALUES (%s, %s, %s, %s)",
                (session_id, x_user_id, req.input_file, "Running")
            )
        conn.commit()
        return {"session_id": session_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class UpdateSessionRequest(BaseModel):
    session_id: str
    status: str

@router.patch("/api/session")
def update_session(req: UpdateSessionRequest, x_user_id: int = Header(...)):
    """Update session status (e.g., Complete, Cancelled)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sessions SET status = %s WHERE session_id = %s AND user_id = %s",
                (req.status, req.session_id, x_user_id)
            )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
