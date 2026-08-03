import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import json

router = APIRouter()

@router.post("/api/parse_validation")
async def parse_validation(
    file: UploadFile = File(...),
    attribute_col: str = Form(...),
    product_type_col: str = Form(""),
    dropdown_col: str = Form(...)
):
    """
    Parse uploaded Validation Excel file and map columns.
    Returns a dictionary of ValidationEntry objects (as JSON).
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
        
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), dtype=str)
        df = df.fillna("")
        df.columns = [str(c).strip() for c in df.columns]
        
        if attribute_col not in df.columns or dropdown_col not in df.columns:
            raise HTTPException(status_code=400, detail="Mapped columns not found in file")
            
        validation_map = {}
        
        for _, row in df.iterrows():
            attr_id = str(row[attribute_col]).strip()
            if not attr_id:
                continue
                
            ptype = str(row[product_type_col]).strip() if product_type_col and product_type_col in df.columns else ""
            dd_val = str(row[dropdown_col]).strip()
            
            # Check for tooltip/free text
            is_free_text = False
            tooltip = ""
            allowed = []
            
            dd_lower = dd_val.lower()
            if dd_lower.startswith("tooltip:") or dd_lower.startswith("example:"):
                is_free_text = True
                tooltip = dd_val
            elif dd_val:
                allowed = [x.strip() for x in dd_val.split("|") if x.strip()]
                
            entry_dict = {
                "attribute_id": attr_id,
                "product_type": ptype,
                "allowed_values": allowed,
                "is_free_text": is_free_text,
                "tooltip": tooltip
            }

            key = attr_id.lower()
            if key not in validation_map:
                validation_map[key] = []
            validation_map[key].append(entry_dict)
                
        # Calculate total entries
        total_entries = sum(len(lst) for lst in validation_map.values())
        
        return JSONResponse({
            "validation_map": validation_map,
            "entry_count": total_entries
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse validation file: {str(e)}")
