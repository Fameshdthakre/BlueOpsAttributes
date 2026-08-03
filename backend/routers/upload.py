import io
import pandas as pd
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
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
        
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), dtype=str)
        
        # Clean dataframe
        df = df.fillna("")
        df.columns = [str(c).strip() for c in df.columns]
        
        headers = list(df.columns)
        
        # Take first 10 rows for preview
        preview = df.head(10).to_dict(orient="records")
        
        # Write to temporary file for the build_jobs endpoint to pick up
        upload_id = str(uuid.uuid4())
        tmp_dir = "/tmp"
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir, exist_ok=True)
            
        parquet_path = os.path.join(tmp_dir, f"{upload_id}.parquet")
        df.to_parquet(parquet_path)
        
        return JSONResponse({
            "upload_id": upload_id,
            "headers": headers,
            "preview": preview,
            "row_count": len(df)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Excel file: {str(e)}")
