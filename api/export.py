from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from backend.result_writer import stream_csv_from_session
from backend.database import get_connection
import datetime

app = FastAPI()

@app.get("/api/export")
def export_session(session_id: str, device_id: str = "global"):
    """
    Generate a CSV file for the given session ID and stream it as a download.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
        
    try:
        # Get session details for filename
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Get unique ASIN count
                cur.execute("SELECT COUNT(DISTINCT asin) FROM job_results WHERE session_id = %s", (session_id,))
                asin_count = cur.fetchone()[0]
                
                # Get session timestamp and verify device ownership
                cur.execute("SELECT timestamp, device_id FROM sessions WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                if not row or row[1] != device_id:
                    raise HTTPException(status_code=404, detail="Session not found or unauthorized")
                ts = row[0]
        finally:
            conn.close()
            
        # Format: M-D-YYYY_H-MM
        date_str = ts.strftime("%m-%d-%Y_%H-%M")
        # Ensure no leading zeros in month/day to strictly match "7-24-2026_9-59" format if desired,
        # but strftime `%m` is standard. We will use standard %m-%d-%Y_%H-%M
        # Actually to match the example exactly: 7-24-2026_9-59
        date_str = f"{ts.month}-{ts.day}-{ts.year}_{ts.hour}-{ts.minute:02d}"
        
        filename = f'blueops_export_{asin_count}-ASINs_{date_str}.csv'
        
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            stream_csv_from_session(session_id),
            media_type="text/csv",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")
