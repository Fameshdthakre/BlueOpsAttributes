from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from backend.result_writer import generate_excel_from_session

app = FastAPI()

@app.get("/api/export")
def export_excel(session_id: str):
    """
    Generate an Excel file for the given session ID and return it as a download.
    """
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
        
    try:
        excel_bytes = generate_excel_from_session(session_id)
        
        headers = {
            'Content-Disposition': f'attachment; filename="blueops_export_{session_id[:8]}.xlsx"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel: {str(e)}")
