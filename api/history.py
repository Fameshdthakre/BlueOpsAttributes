from fastapi import FastAPI, HTTPException, Query
from psycopg2.extras import RealDictCursor
from backend.database import get_connection

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
