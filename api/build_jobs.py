import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import traceback
from loguru import logger

app = FastAPI()

class Mappings(BaseModel):
    asinCol: str
    attrCol: str
    ptypeCol: Optional[str] = ""
    brandCol: Optional[str] = ""
    titleCol: Optional[str] = ""
    barcodeCol: Optional[str] = ""
    descCol: Optional[str] = ""
    urlsCol: Optional[str] = ""

class BuildJobsRequest(BaseModel):
    upload_id: str
    mappings: Mappings
    val_upload_id: Optional[str] = None
    val_attr_col: Optional[str] = ""
    val_ptype_col: Optional[str] = ""
    val_dd_col: Optional[str] = ""

@app.post("/api/build_jobs")
def build_jobs(req: BuildJobsRequest):
    """
    Builds the job list entirely server-side from the uploaded parquet file.
    This avoids sending massive JSON payloads to the browser and crashing it.
    """
    try:
        tmp_dir = "/tmp"
        
        # 1. Load ASIN data
        asin_path = os.path.join(tmp_dir, f"{req.upload_id}.parquet")
        if not os.path.exists(asin_path):
            raise HTTPException(status_code=404, detail="Upload session expired. Please re-upload the file.")
            
        df_asin = pd.read_parquet(asin_path)
        
        # 2. Load Validation data (if provided)
        validation_map = {}
        if req.val_upload_id and req.val_attr_col and req.val_dd_col:
            val_path = os.path.join(tmp_dir, f"{req.val_upload_id}.parquet")
            if os.path.exists(val_path):
                df_val = pd.read_parquet(val_path)
                for _, row in df_val.iterrows():
                    aId = str(row.get(req.val_attr_col, "")).strip()
                    if not aId or aId == "nan" or aId == "None":
                        continue
                        
                    pType = str(row.get(req.val_ptype_col, "")).strip() if req.val_ptype_col else ""
                    if pType == "nan" or pType == "None": pType = ""
                    
                    rawVal = str(row.get(req.val_dd_col, "")).strip()
                    if rawVal == "nan" or rawVal == "None": rawVal = ""
                    
                    is_free_text = False
                    tooltip = ""
                    allowed_values = []
                    
                    if rawVal.lower().startswith("tooltip:") or rawVal.lower().startswith("example:"):
                        is_free_text = True
                        tooltip = rawVal
                    else:
                        allowed_values = [v.strip() for v in rawVal.split("|") if v.strip()]
                        
                    key = aId.lower()
                    if key not in validation_map:
                        validation_map[key] = []
                        
                    validation_map[key].append({
                        "attribute_id": aId,
                        "product_type": pType,
                        "allowed_values": allowed_values,
                        "is_free_text": is_free_text,
                        "tooltip": tooltip
                    })
                    
        # 3. Build Job Map
        m = req.mappings
        exclude_cols = {c for c in [m.asinCol, m.attrCol, m.ptypeCol, m.brandCol, m.titleCol, m.barcodeCol, m.descCol, m.urlsCol] if c}
        all_cols = list(df_asin.columns)
        extra_cols = [c for c in all_cols if c not in exclude_cols]
        
        job_map = {}
        
        for _, row in df_asin.iterrows():
            rowAsin = str(row.get(m.asinCol, "")).strip()
            rowAttr = str(row.get(m.attrCol, "")).strip()
            if not rowAsin or not rowAttr or rowAsin == "nan" or rowAsin == "None":
                continue
                
            key = rowAsin
            
            if key not in job_map:
                extra = {}
                for col in extra_cols:
                    val = row.get(col)
                    if pd.notna(val):
                        extra[col] = str(val)
                        
                urlsColVal = str(row.get(m.urlsCol, "")) if m.urlsCol else ""
                custom_urls = []
                if urlsColVal and urlsColVal != "nan" and urlsColVal != "None":
                    custom_urls = [u.strip() for u in urlsColVal.split("|") if u.strip()]
                    
                ptypeVal = str(row.get(m.ptypeCol, "")).strip() if m.ptypeCol else ""
                brandVal = str(row.get(m.brandCol, "")).strip() if m.brandCol else ""
                titleVal = str(row.get(m.titleCol, "")).strip() if m.titleCol else ""
                barcodeVal = str(row.get(m.barcodeCol, "")).strip() if m.barcodeCol else ""
                descVal = str(row.get(m.descCol, "")).strip() if m.descCol else ""
                
                if ptypeVal == "nan" or ptypeVal == "None": ptypeVal = ""
                if brandVal == "nan" or brandVal == "None": brandVal = ""
                if titleVal == "nan" or titleVal == "None": titleVal = ""
                if barcodeVal == "nan" or barcodeVal == "None": barcodeVal = ""
                if descVal == "nan" or descVal == "None": descVal = ""
                
                job_map[key] = {
                    "asin": rowAsin,
                    "attributes": [],
                    "product_type": ptypeVal,
                    "brand": brandVal,
                    "title": titleVal,
                    "barcode": barcodeVal,
                    "description": descVal,
                    "custom_urls": custom_urls if custom_urls else None,
                    "extra_data": extra,
                    "row_index": 0 
                }
                
            attrs = [a.strip() for a in rowAttr.split("|") if a.strip()]
            for a in attrs:
                if a not in job_map[key]["attributes"]:
                    job_map[key]["attributes"].append(a)
                    
        jobs_list = list(job_map.values())
        logger.info(f"Built {len(jobs_list)} unique ASIN jobs from {len(df_asin)} rows.")
        
        return {
            "jobs": jobs_list,
            "validation_map": validation_map
        }
        
    except Exception as e:
        logger.error(f"Error building jobs: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
