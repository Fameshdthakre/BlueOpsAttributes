from fastapi import FastAPI, HTTPException, Query, Request
from psycopg2.extras import RealDictCursor
from backend.database import get_connection
import json

app = FastAPI()

@app.get("/api/history")
def get_history(session_id: str = Query(None)):
    """Fetch session history or details of a specific session."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if session_id:
                # Get results for specific session
                cur.execute(
                    "SELECT * FROM job_results WHERE session_id = %s ORDER BY id ASC", 
                    (session_id,)
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
                    GROUP BY s.session_id
                    ORDER BY s.timestamp DESC
                """)
                sessions = cur.fetchall()
                return {"sessions": [dict(s) for s in sessions]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/history")
async def delete_sessions(request: Request):
    """Delete specific sessions or all sessions."""
    try:
        body = await request.json()
        session_ids = body.get("session_ids")
        clear_all = body.get("clear_all", False)
        
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                if clear_all:
                    cur.execute("DELETE FROM job_results")
                    cur.execute("DELETE FROM sessions")
                elif session_ids and isinstance(session_ids, list):
                    format_strings = ','.join(['%s'] * len(session_ids))
                    cur.execute(f"DELETE FROM job_results WHERE session_id IN ({format_strings})", tuple(session_ids))
                    cur.execute(f"DELETE FROM sessions WHERE session_id IN ({format_strings})", tuple(session_ids))
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

