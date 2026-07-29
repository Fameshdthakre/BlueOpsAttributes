from fastapi import FastAPI, HTTPException, Query, Request, Header
from typing import Optional
from psycopg2.extras import RealDictCursor
from backend.database import get_connection
import json

app = FastAPI()

@app.get("/api/history")
def get_history(session_id: str = Query(None), x_user_id: int = Header(...)):
    """Fetch session history or details of a specific session."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if session_id:
                # Get results for specific session (filtered by device ownership)
                cur.execute(
                    """SELECT jr.* FROM job_results jr
                       JOIN sessions s ON jr.session_id = s.session_id
                       WHERE jr.session_id = %s AND s.user_id = %s
                       ORDER BY jr.id ASC""", 
                    (session_id, x_user_id)
                )
                results = cur.fetchall()
                
                # Fetch basic stats
                cur.execute("""
                    SELECT match_status, count(*) 
                    FROM job_results 
                    WHERE session_id = %s 
                    GROUP BY match_status
                """, (session_id,))
                stats_raw = cur.fetchall()
                
                # We need to map stats per-ASIN usually, but this is fine per attribute too
                
                return {
                    "results": [dict(r) for r in results],
                    "stats": {r["match_status"]: r["count"] for r in stats_raw}
                }
            else:
                # List all sessions
                cur.execute("""
                    SELECT s.session_id, s.timestamp, s.input_file, s.status, 
                           COUNT(DISTINCT j.asin) as asins_processed
                    FROM sessions s
                    LEFT JOIN job_results j ON s.session_id = j.session_id
                    WHERE s.user_id = %s
                    GROUP BY s.session_id
                    ORDER BY s.timestamp DESC
                """, (x_user_id,))
                sessions = cur.fetchall()
                return {"sessions": [dict(s) for s in sessions]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/history")
async def delete_sessions(request: Request, x_user_id: int = Header(...)):
    """Delete specific sessions or all sessions."""
    try:
        body = await request.json()
        session_ids = body.get("session_ids")
        clear_all = body.get("clear_all", False)
        
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                if clear_all:
                    cur.execute("DELETE FROM job_results WHERE session_id IN (SELECT session_id FROM sessions WHERE user_id = %s)", (x_user_id,))
                    cur.execute("DELETE FROM sessions WHERE user_id = %s", (x_user_id,))
                elif session_ids and isinstance(session_ids, list):
                    format_strings = ','.join(['%s'] * len(session_ids))
                    
                    # Ensure we only delete sessions owned by this user
                    cur.execute(f"DELETE FROM job_results WHERE session_id IN (SELECT session_id FROM sessions WHERE session_id IN ({format_strings}) AND user_id = %s)", tuple(session_ids) + (x_user_id,))
                    cur.execute(f"DELETE FROM sessions WHERE session_id IN ({format_strings}) AND user_id = %s", tuple(session_ids) + (x_user_id,))
                else:
                    raise HTTPException(status_code=400, detail="Must provide session_ids list or clear_all=True")
                
            conn.commit()
            return {"status": "success"}
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

