from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.responses import Response
from backend.result_writer import generate_excel_from_session, generate_wide_excel_from_session
from backend.database import get_connection
import datetime

router = APIRouter()

@router.get("/api/export")
def export_session(session_id: str, user_id: int, format: str = "long"):
    """
    Generate an Excel file for the given session ID and return it as a download.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
        
    try:
        # Get session details for filename
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Get unique ASIN count
                cur.execute("""
                    SELECT COUNT(DISTINCT jr.asin) 
                    FROM job_results jr
                    JOIN sessions s ON jr.session_id = s.session_id
                    WHERE jr.session_id = %s AND s.user_id = %s
                """, (session_id, user_id))
                asin_count = cur.fetchone()[0]
                
                # Get session timestamp and verify user ownership
                cur.execute("SELECT timestamp FROM sessions WHERE session_id = %s AND user_id = %s", (session_id, user_id))
                row = cur.fetchone()
                if not row:
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
        
        if format == "wide":
            filename = f'blueops_export_wide_{asin_count}-ASINs_{date_str}.xlsx'
            excel_bytes = generate_wide_excel_from_session(session_id)
        else:
            filename = f'blueops_export_detailed_{asin_count}-ASINs_{date_str}.xlsx'
            excel_bytes = generate_excel_from_session(session_id)
        
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel: {str(e)}")
