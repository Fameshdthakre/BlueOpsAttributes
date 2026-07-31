import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Parse uploaded Excel file.
    Returns headers, first 10 rows preview, and the raw parsed jobs.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
        
    if getattr(file, "size", 0) and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), dtype=str)
        
        # Clean dataframe
        df = df.fillna("")
        df.columns = [str(c).strip() for c in df.columns]
        
        headers = list(df.columns)
        
        # Take first 10 rows for preview
        preview = df.head(10).to_dict(orient="records")
        
        # Return all rows for the client to hold in state
        all_rows = df.to_dict(orient="records")
        
        return JSONResponse({
            "headers": headers,
            "preview": preview,
            "row_count": len(df),
            "data": all_rows
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Excel file: {str(e)}")
